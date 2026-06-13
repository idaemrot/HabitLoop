// ─── BullMQ Job System — Entry Point ─────────────────────────────────────────
//
// Exports:
//   startWorkers()  — called once at server boot from src/index.ts
//   stopWorkers()   — called during graceful shutdown
//   Queue instances — imported by producer call sites (checkInService, etc.)
//
// Architecture:
//   ┌─────────────────────────────────────────────────────────────┐
//   │  HTTP Request Handler (checkInService, undoTodayCheckIn)    │
//   │                                                             │
//   │  leaderboardQueue.add('ADD_SCORE' | 'REMOVE_SCORE', data)  │
//   │  streakValidationQueue.add('VALIDATE_STREAK', data)        │
//   │  notificationsQueue.add('FRIEND_CHECKIN', data)            │
//   └─────────────────┬───────────────────────────────────────────┘
//                     │  Redis (BullMQ sorted sets + lists)
//   ┌─────────────────▼───────────────────────────────────────────┐
//   │  Workers (same Node.js process, separate ioredis connection) │
//   │                                                             │
//   │  createLeaderboardWorker()    concurrency: 10              │
//   │  createStreakValidationWorker() concurrency: 5             │
//   │  createNotificationsWorker()  concurrency: 20              │
//   └─────────────────────────────────────────────────────────────┘
//
// Worker isolation:
//   Workers run in the SAME Node.js process as the HTTP server. This is
//   the recommended approach for a monolith. If scaling requires, the
//   workers can be extracted to a separate process by importing this module
//   from a dedicated worker entrypoint (e.g. src/worker.ts).
//
// Dead-letter strategy:
//   Jobs that exhaust all 5 attempts transition to the "failed" state.
//   They are retained in Redis according to removeOnFail: { count: 1000 }.
//   The admin endpoint GET /api/jobs/failed surfaces these for inspection.
//   Manual replay: queue.retryJobs({ count: N, state: 'failed' }).
// ─────────────────────────────────────────────────────────────────────────────

import type { Worker } from 'bullmq';

import { createStreakValidationWorker } from './workers/streakWorker';
import { createNotificationsWorker }    from './workers/notificationsWorker';
import { createLeaderboardWorker }      from './workers/leaderboardWorker';
import { closeQueues }                  from './queues';

// Re-export queues so producers can import from a single path
export { streakValidationQueue, notificationsQueue, leaderboardQueue } from './queues';
export { QUEUE_NAMES }                                                 from './types';
export type {
  StreakValidationJobData,
  NotificationJobData,
  LeaderboardJobData,
}                                                                      from './types';

// ─── Worker registry ──────────────────────────────────────────────────────────
let workers: Worker[] = [];

// ─── startWorkers ─────────────────────────────────────────────────────────────
/**
 * Instantiates all workers and registers them in the module-level registry.
 * Must be called once after Redis is connected (connectRedis() resolves).
 * Idempotent: calling twice is a no-op (workers already running).
 */
export function startWorkers(): void {
  if (workers.length > 0) {
    console.warn('[BullMQ] startWorkers() called more than once — skipped');
    return;
  }

  workers = [
    createStreakValidationWorker(),
    createNotificationsWorker(),
    createLeaderboardWorker(),
  ];

  console.info(
    `✅ BullMQ workers started (${workers.length} workers: ` +
    'streak-validation, notifications, leaderboard-recompute)',
  );
}

// ─── stopWorkers ──────────────────────────────────────────────────────────────
/**
 * Gracefully shuts down all workers and queues.
 * Should be called during SIGTERM / SIGINT handling.
 *
 * Each worker.close() waits for the current job to finish (up to the
 * forcedShutdownTimeout) before terminating. This prevents data corruption
 * on mid-flight jobs.
 */
export async function stopWorkers(): Promise<void> {
  console.info('[BullMQ] Closing workers...');

  await Promise.all(workers.map((w) => w.close()));
  await closeQueues();

  workers = [];
  console.info('🔌 BullMQ workers stopped');
}
