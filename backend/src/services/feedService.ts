import { prisma } from '../config/database';
import { ActivityType } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedItem {
  id:           string;
  activityType: string;
  metadata:     unknown;
  createdAt:    Date;
  user: {
    id:        string;
    username:  string;
    avatarUrl: string | null;
  };
  habit: {
    id:    string;
    title: string;
    color: string;
    icon:  string;
  } | null;
}

export interface FeedResponse {
  items:      FeedItem[];
  pagination: {
    limit:      number;
    cursor:     string | null;  // ISO timestamp of last item — pass as ?cursor= on next request
    hasMore:    boolean;
  };
}

// ─── Feed Architecture ────────────────────────────────────────────────────────
//
// The feed shows HABIT_CHECKED_IN (and optionally STREAK_MILESTONE) activities
// from the requesting user's accepted friends, newest first.
//
// Query strategy — two-step approach (avoids a slow correlated subquery):
//
//   Step 1: Resolve friend IDs
//     SELECT requester_id, receiver_id FROM friendships
//     WHERE status = 'ACCEPTED'
//       AND (requester_id = $userId OR receiver_id = $userId)
//
//     Uses @@index([requesterId, status]) + @@index([receiverId, status]).
//     Returns O(f) rows where f = friend count. Typically < 500.
//
//   Step 2: Fetch activities
//     SELECT a.*, u.id, u.username, u.avatar_url, h.id, h.title, h.color, h.icon
//     FROM activities a
//     JOIN users  u ON u.id = a.user_id
//     LEFT JOIN habits h ON h.id = a.habit_id
//     WHERE a.user_id IN ($friendIds)
//       AND a.activity_type IN ('HABIT_CHECKED_IN', 'STREAK_MILESTONE')
//       AND a.created_at < $cursor            -- cursor pagination
//     ORDER BY a.created_at DESC
//     LIMIT $limit + 1                        -- +1 to detect hasMore
//
//     Index used: @@index([userId, createdAt(sort: Desc)]) on activities.
//     With IN($friendIds), PostgreSQL uses an Index Scan per userId value
//     combined via bitmap OR, then merges and sorts. For large friend counts
//     (>100), the planner may switch to a sequential scan — acceptable because
//     the activity table will have a composite index on (user_id, created_at).
//
// Cursor-based pagination (vs offset):
//   - Offset pagination degrades to O(offset) scan as page number increases.
//   - Cursor pagination is O(1) per page — the WHERE created_at < cursor clause
//     lets the index seek directly to the right position.
//   - We use ISO timestamp as cursor (sufficient precision for a feed).
//     Ties (same ms) are broken by id DESC (secondary sort).
//
// ─────────────────────────────────────────────────────────────────────────────

const FEED_ACTIVITY_TYPES: ActivityType[] = [
  ActivityType.HABIT_CHECKED_IN,
  ActivityType.STREAK_MILESTONE,
];
const MAX_LIMIT     = 50;

const USER_SELECT = {
  id:        true,
  username:  true,
  avatarUrl: true,
} as const;

const HABIT_SELECT = {
  id:    true,
  title: true,
  color: true,
  icon:  true,
} as const;

// ─── getFeed ──────────────────────────────────────────────────────────────────
export async function getFeed(
  userId:       string,
  limitParam:   number,
  cursorParam?: string,       // ISO timestamp string from previous page's last item
): Promise<FeedResponse> {
  const limit = Math.min(Math.max(1, limitParam), MAX_LIMIT);

  // Step 1: Resolve accepted friend IDs (O(f), index-backed)
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId },
        { receiverId:  userId },
      ],
    },
    select: { requesterId: true, receiverId: true },
  });

  // Flatten to a de-duplicated set of friend user IDs
  const friendIds = [
    ...new Set(
      friendships.flatMap((f) =>
        f.requesterId === userId ? [f.receiverId] : [f.requesterId],
      ),
    ),
  ];

  // Empty friend list → empty feed (no DB query needed)
  if (friendIds.length === 0) {
    return {
      items:      [],
      pagination: { limit, cursor: null, hasMore: false },
    };
  }

  // Build cursor condition
  const cursorDate = cursorParam ? new Date(cursorParam) : undefined;
  const cursorCondition = cursorDate
    ? {
        OR: [
          // Strictly earlier
          { createdAt: { lt: cursorDate } },
          // Same millisecond — break ties by id lexicographic order (UUID v4 is random)
          { createdAt: cursorDate, id: { lt: cursorParam! } },
        ],
      }
    : undefined;

  // Step 2: Fetch activities (O(k) per friend, index-backed)
  // Fetch limit + 1 to determine hasMore without a COUNT query
  const activities = await prisma.activity.findMany({
    where: {
      userId:       { in: friendIds },
      activityType: { in: FEED_ACTIVITY_TYPES },
      ...cursorCondition,
    },
    include: {
      user:  { select: USER_SELECT },
      habit: { select: HABIT_SELECT },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id:        'desc' },   // secondary sort for tie-breaking
    ],
    take: limit + 1,
  });

  // Determine if there are more items
  const hasMore = activities.length > limit;
  const items   = hasMore ? activities.slice(0, limit) : activities;

  // Build next cursor from the last returned item
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem
    ? lastItem.createdAt.toISOString()
    : null;

  return {
    items:      items as unknown as FeedItem[],
    pagination: {
      limit,
      cursor:  nextCursor,
      hasMore,
    },
  };
}
