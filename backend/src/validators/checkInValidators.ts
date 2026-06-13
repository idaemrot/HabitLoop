import { z } from 'zod';

// ─── Check-in body ────────────────────────────────────────────────────────────
// completedDate is intentionally NOT accepted from the client.
// It is computed server-side from the user's stored timezone.
export const createCheckInSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid habit ID'),
  }),
  body: z.object({
    note: z
      .string()
      .max(500, 'Note must be at most 500 characters')
      .trim()
      .optional(),
  }),
});

// ─── History query params ─────────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid habit ID'),
  }),
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? Math.max(1, parseInt(v, 10)) : 1)),
    pageSize: z
      .string()
      .optional()
      .transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v, 10))) : 30)),
  }),
});

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>['body'];
export type HistoryQuery       = z.infer<typeof historyQuerySchema>['query'];
