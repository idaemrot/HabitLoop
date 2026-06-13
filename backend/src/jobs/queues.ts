// ─── Queue Singletons ─────────────────────────────────────────────────────────
//
// Each queue is a singleton. BullMQ Queue instances are lightweight — they
// don't hold a persistent connection until the first job is enqueued.
//
// Default job options (overridable per add() call):
//   attempts:        5      — enough headroom for transient Redis outages
//   backoff:         exponential starting at 1 s (1→2→4→8→16 s)
//   removeOnComplete 24 h   — completed jobs kept for one day (observability)
//   removeOnFail:    1000   — keep last 1000 failed jobs as dead-letter log
//
// Dead-letter strategy:
//   BullMQ has no explicit DLQ concept. Jobs that exhaust all attempts stay
//   in the "failed" state and are subject to removeOnFail retention.
//   The admin API (GET /api/jobs/failed) can surface these for manual replay.
//   In a future iteration, a "failed" event listener could push them to an
//   alerting channel (PagerDuty, Slack) or a separate repair queue.
// ─────────────────────────────────────────────────────────────────────────────

import { Queue } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq';
import {
  QUEUE_NAMES,
  type StreakValidationJobData,
  type StreakValidationJobResult,
  type NotificationJobData,
  type NotificationJobResult,
  type LeaderboardJobData,
  type LeaderboardJobResult,
} from './types';

// ─── Shared defaults ──────────────────────────────────────────────────────────
const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type:  'exponential' as const,
    delay: 1_000,          // 1 s → 2 s → 4 s → 8 s → 16 s
  },
  removeOnComplete: { age: 86_400 },    // keep completed jobs for 24 h
  removeOnFail:     { count: 1_000 },   // dead-letter: keep last 1000 failures
} as const;

// ─── streak-validation ────────────────────────────────────────────────────────
export const streakValidationQueue = new Queue<
  StreakValidationJobData,
  StreakValidationJobResult
>(QUEUE_NAMES.STREAK_VALIDATION, {
  connection:        getBullMQConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

// ─── notifications ────────────────────────────────────────────────────────────
export const notificationsQueue = new Queue<
  NotificationJobData,
  NotificationJobResult
>(QUEUE_NAMES.NOTIFICATIONS, {
  connection:        getBullMQConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

// ─── leaderboard-recompute ────────────────────────────────────────────────────
export const leaderboardQueue = new Queue<
  LeaderboardJobData,
  LeaderboardJobResult
>(QUEUE_NAMES.LEADERBOARD_RECOMPUTE, {
  connection:        getBullMQConnection(),
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    // Leaderboard jobs are idempotent (ZINCRBY is not, but ZADD for SYNC_USER is).
    // We use a deduplication key for SYNC_USER so multiple repair requests
    // for the same user collapse into a single job.
    // ADD_SCORE / REMOVE_SCORE do NOT use dedup — each event is distinct.
  },
});

// ─── Graceful queue close ─────────────────────────────────────────────────────
export async function closeQueues(): Promise<void> {
  await Promise.all([
    streakValidationQueue.close(),
    notificationsQueue.close(),
    leaderboardQueue.close(),
  ]);
  console.info('🔌 BullMQ queues closed');
}
