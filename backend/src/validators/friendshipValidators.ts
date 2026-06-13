import { z } from 'zod';

// ─── Send friend request ───────────────────────────────────────────────────────
// Only the target user ID is needed — requesterId always comes from JWT.
export const sendRequestSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('receiverId must be a valid UUID'),
  }),
});

// ─── Respond to a request (accept / reject) ───────────────────────────────────
// :id = friendship.id in the URL. Action comes from body.
export const respondToRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Friendship ID must be a valid UUID'),
  }),
  body: z.object({
    action: z.enum(['ACCEPTED', 'DECLINED'], {
      errorMap: () => ({ message: "action must be 'ACCEPTED' or 'DECLINED'" }),
    }),
  }),
});

// ─── Remove friend (or cancel outgoing request) ───────────────────────────────
// :id = friendship.id
export const friendshipIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Friendship ID must be a valid UUID'),
  }),
});

// ─── Export inferred types ────────────────────────────────────────────────────
export type SendRequestInput    = z.infer<typeof sendRequestSchema>['body'];
export type RespondRequestInput = z.infer<typeof respondToRequestSchema>['body'];
