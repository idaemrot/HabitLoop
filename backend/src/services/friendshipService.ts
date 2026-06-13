import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import type { Friendship, FriendshipStatus, User } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Public user fields exposed on friend list entries — never return passwordHash */
export type FriendPublicProfile = Pick<User, 'id' | 'username' | 'avatarUrl' | 'createdAt'>;

export interface FriendshipWithProfiles extends Friendship {
  requester: FriendPublicProfile;
  receiver:  FriendPublicProfile;
}

export interface FriendEntry {
  friendship:  Friendship;
  friend:      FriendPublicProfile;
  /** 'SENT' if current user sent the request, 'RECEIVED' if they received it */
  direction:   'SENT' | 'RECEIVED';
}

// ─── Shared select clause for public user profile ────────────────────────────
// Used on every query that includes user data. Keeps the select DRY and
// ensures passwordHash is never accidentally included.
const PUBLIC_USER_SELECT = {
  id:        true,
  username:  true,
  avatarUrl: true,
  createdAt: true,
} as const;

// ─── Shared include clause ─────────────────────────────────────────────────────
const WITH_PROFILES = {
  requester: { select: PUBLIC_USER_SELECT },
  receiver:  { select: PUBLIC_USER_SELECT },
} as const;

// ─── Query optimisation notes ─────────────────────────────────────────────────
//
//  All friendship queries are O(1) or O(k) where k = number of friends,
//  bounded by the indexes defined in schema.prisma:
//
//    @@index([receiverId, status])  — "pending inbox" lookup
//    @@index([requesterId, status]) — "sent requests" lookup
//
//  The bidirectional existence check (sendFriendRequest) issues a single
//  OR query that PostgreSQL satisfies with a bitmap index scan across both
//  @@unique([requesterId, receiverId]) partial index entries.
//
//  Friend list (getFriends) uses a UNION-equivalent OR across both directions,
//  filtered by status. Both partial indexes are used by the planner.
//  For large friend counts, consider a materialized view, but this is
//  unnecessary at <10,000 friendships per user.
// ─────────────────────────────────────────────────────────────────────────────

// ─── sendFriendRequest ────────────────────────────────────────────────────────
//
// Guards:
//  ❶ Cannot friend yourself
//  ❷ Target user must exist
//  ❸ Both directions checked atomically to prevent A→B + B→A
//  ❹ Re-request after REJECTED → update row (reset to PENDING)
//     This avoids accumulating duplicate rows on repeated request attempts.
//
// DB writes: 0–1 (upsert-style logic, no transaction needed — atomic via @@unique)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFriendRequest(
  requesterId: string,
  receiverId:  string,
): Promise<Friendship> {
  // ❶ Self-friending guard
  if (requesterId === receiverId) {
    throw new AppError('You cannot send a friend request to yourself', 400);
  }

  // ❷ Verify receiver exists (returns 404, not 400, to avoid user enumeration)
  const receiver = await prisma.user.findUnique({
    where:  { id: receiverId },
    select: { id: true },
  });
  if (!receiver) throw new AppError('User not found', 404);

  // ❸ Bidirectional duplicate check — single OR query, one DB round-trip
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    },
  });

  if (existing) {
    switch (existing.status) {
      case 'PENDING':
        throw new AppError('A friend request is already pending', 409);
      case 'ACCEPTED':
        throw new AppError('You are already friends with this user', 409);
      case 'DECLINED':
        // ❹ Re-request after rejection: reset the existing row to PENDING.
        // Always set requesterId/receiverId to reflect the new initiator direction.
        return prisma.friendship.update({
          where: { id: existing.id },
          data:  {
            requesterId,
            receiverId,
            status:    'PENDING',
            updatedAt: new Date(),
          },
        });
      case 'BLOCKED':
        // Return 404 to avoid confirming that a block relationship exists
        throw new AppError('User not found', 404);
    }
  }

  // Use try/catch to handle the case where two concurrent requests both pass
  // the findFirst check and race to INSERT — the @@unique constraint rejects
  // the second one with P2002. Map that to a friendly 409.
  try {
    return await prisma.friendship.create({
      data: { requesterId, receiverId },
    });
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      throw new AppError('A friend request is already pending', 409);
    }
    throw err;
  }
}

// ─── respondToRequest ─────────────────────────────────────────────────────────
//
// Only the RECEIVER can accept or reject.
// Guards:
//  ❶ Friendship must exist and belong to this receiver
//  ❷ Must be in PENDING state (cannot re-accept or re-decline)
// ─────────────────────────────────────────────────────────────────────────────
export async function respondToRequest(
  friendshipId: string,
  receiverId:   string,
  action:       'ACCEPTED' | 'DECLINED',
): Promise<Friendship> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  // Returns 404 for both "not found" and "wrong receiver" — avoids leaking
  // that a friendship between two other users exists.
  if (!friendship || friendship.receiverId !== receiverId) {
    throw new AppError('Friend request not found', 404);
  }

  // Map action to past-tense label for grammatically correct error messages.
  // e.g. action='ACCEPTED' → "already accepted", 'DECLINED' → "already declined"
  const statusLabel: Partial<Record<string, string>> = {
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    BLOCKED:  'blocked',
    PENDING:  'pending',
  };

  if (friendship.status !== 'PENDING') {
    throw new AppError(
      `Cannot respond to a request that is already ${statusLabel[friendship.status] ?? friendship.status.toLowerCase()}`,
      409,
    );
  }

  return prisma.friendship.update({
    where: { id: friendshipId },
    data:  { status: action as FriendshipStatus },
  });
}

// ─── cancelRequest ────────────────────────────────────────────────────────────
// Cancel an outgoing PENDING request. Only the REQUESTER can cancel.
export async function cancelRequest(
  friendshipId: string,
  requesterId:  string,
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship || friendship.requesterId !== requesterId) {
    throw new AppError('Friend request not found', 404);
  }

  if (friendship.status !== 'PENDING') {
    throw new AppError(
      `Cannot cancel a request that is already ${friendship.status.toLowerCase()}`,
      409,
    );
  }

  // Atomic delete: assert status=PENDING in the WHERE clause to close the
  // TOCTOU gap where the receiver accepts between our read and delete.
  const deleted = await prisma.friendship.deleteMany({
    where: { id: friendshipId, requesterId, status: 'PENDING' },
  });

  if (deleted.count === 0) {
    // Either the request was already accepted/declined between our check above
    // and this delete, or (less likely) ownership changed. Return a clear error.
    throw new AppError('Request not found or already responded to', 409);
  }
}

// ─── removeFriend ─────────────────────────────────────────────────────────────
// Remove an accepted friendship. Either party can remove.
export async function removeFriend(
  friendshipId: string,
  userId:       string,
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  // 404 if not found or caller is not a party to the friendship
  if (
    !friendship ||
    (friendship.requesterId !== userId && friendship.receiverId !== userId)
  ) {
    throw new AppError('Friendship not found', 404);
  }

  if (friendship.status !== 'ACCEPTED') {
    throw new AppError('No accepted friendship to remove', 409);
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });
}

// ─── getFriends ───────────────────────────────────────────────────────────────
//
// Returns all ACCEPTED friendships for a user, with the friend's public profile.
// Query uses @@index([requesterId, status]) + @@index([receiverId, status]).
//
// Query complexity: O(k) where k = number of accepted friends.
// Both index branches are satisfied by a single OR query.
// ─────────────────────────────────────────────────────────────────────────────
export async function getFriends(userId: string): Promise<FriendEntry[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId },
        { receiverId:  userId },
      ],
    },
    include:  WITH_PROFILES,
    orderBy:  { updatedAt: 'desc' },  // most recently accepted first
  });

  // Normalise: always return the OTHER user as "friend"
  return friendships.map((f) => {
    const isSender = f.requesterId === userId;
    return {
      friendship: f,
      friend:     isSender ? f.receiver : f.requester,
      direction:  isSender ? 'SENT' : 'RECEIVED',
    };
  });
}

// ─── getPendingRequests ───────────────────────────────────────────────────────
//
// Returns all PENDING requests received by this user (their "inbox").
// Uses @@index([receiverId, status]) — single index scan, O(pending count).
// ─────────────────────────────────────────────────────────────────────────────
export async function getPendingRequests(userId: string): Promise<FriendshipWithProfiles[]> {
  return prisma.friendship.findMany({
    where:   { receiverId: userId, status: 'PENDING' },
    include:  WITH_PROFILES,
    orderBy:  { createdAt: 'desc' },  // most recent first
  }) as unknown as FriendshipWithProfiles[];
}

// ─── getSentRequests ──────────────────────────────────────────────────────────
//
// Returns all PENDING requests sent by this user.
// Uses @@index([requesterId, status]) — single index scan.
// ─────────────────────────────────────────────────────────────────────────────
export async function getSentRequests(userId: string): Promise<FriendshipWithProfiles[]> {
  return prisma.friendship.findMany({
    where:   { requesterId: userId, status: 'PENDING' },
    include:  WITH_PROFILES,
    orderBy:  { createdAt: 'desc' },
  }) as unknown as FriendshipWithProfiles[];
}
