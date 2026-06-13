// ─── BullMQ Connection ────────────────────────────────────────────────────────
//
// BullMQ MUST use its own ioredis instances. It cannot share the application's
// singleton Redis client because:
//   1. BullMQ requires maxRetriesPerRequest: null (blocking commands)
//   2. A shared connection would break if BullMQ puts the connection into
//      subscriber mode for job event streams
//
// We expose a factory so each Queue and Worker gets its own connection.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../env';

export function getBullMQConnection(): { url: string } {
  return { url: env.REDIS_URL };
}
