// ─── Leaderboard Recompute Worker ─────────────────────────────────────────────
//
// Processes: leaderboard-recompute queue
//
// Job types:
//   ADD_SCORE    — award points after a confirmed check-in commit.
//                  Replaces the fire-and-forget applyCheckInScore() call in
//                  checkInService. Automatic BullMQ retry eliminates silent
//                  point-loss on Redis downtime.
//
//   REMOVE_SCORE — deduct points after an undo-check-in commit.
//                  Replaces the fire-and-forget undoCheckInScore() call.
//                  Prevents the point-farming exploit surviving Redis failures.
//
//   SYNC_USER    — full recompute of a user's alltime score from PostgreSQL.
//                  Uses syncLeaderboardFromDB() which replays all check-ins.
//                  Idempotent: safe to run repeatedly.
//
// Retry behaviour:
//   applyCheckInScore / undoCheckInScore (leaderboardService.ts) throw on any
//   Redis failure — connection-level or a per-command pipeline error. Neither
//   is called from a fire-and-forget site anymore, so nothing here catches
//   that: it propagates out of this processor, BullMQ marks the job failed,
//   and its exponential-backoff retry (up to 5 attempts, see jobs/queues.ts)
//   takes over. This is what actually eliminates the silent point-loss the
//   BullMQ migration was meant to fix.
//
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, type Job } from 'bullmq';
import { getBullMQConnection } from '../../config/bullmq';
import { getRedisClient } from '../../config/redis';
import {
  applyCheckInScore,
  undoCheckInScore,
  syncLeaderboardFromDB,
} from '../../services/leaderboardService';
import {
  QUEUE_NAMES,
  type LeaderboardJobData,
  type LeaderboardJobResult,
} from '../types';
import { getIO } from '../../sockets';
import { SOCKET_EVENTS } from '../../sockets/events';

// ─── Socket Helper ────────────────────────────────────────────────────────────
function emitLeaderboardUpdated(): void {
  try {
    getIO().emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, { period: 'alltime' });
    getIO().emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, { period: 'weekly' });
    getIO().emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, { period: 'monthly' });
  } catch (err: unknown) {
    console.warn('[LeaderboardWorker] socket emit error:', (err as Error).message);
  }
}

// ─── Processor ───────────────────────────────────────────────────────────────
// Exported so unit tests can drive it directly without a real BullMQ/Redis
// connection.
export async function processLeaderboardJob(
  job: Job<LeaderboardJobData, LeaderboardJobResult>,
): Promise<LeaderboardJobResult> {
  const { type } = job.data;

  switch (type) {
    case 'ADD_SCORE': {
      const { userId, prevStreak, currentStreak } = job.data;

      if (job.id) {
        const redis = getRedisClient();
        const idempotencyKey = `processed:leaderboard:add:${job.id}`;
        const acquired = await redis.setnx(idempotencyKey, '1');
        if (acquired === 0) {
          console.info(`[LeaderboardWorker] ADD_SCORE skipped (already processed): ${job.id}`);
          return { userId, delta: 0, operation: 'ADD_SCORE' };
        }
        // Keep the processed key for 30 days
        await redis.expire(idempotencyKey, 2592000);
      }

      // applyCheckInScore throws on Redis failure — left unhandled here on
      // purpose so BullMQ's retry mechanism kicks in.
      const delta = await applyCheckInScore(userId, currentStreak, prevStreak);

      if (delta > 0) {
        emitLeaderboardUpdated();
      }

      console.info(
        `[LeaderboardWorker] ADD_SCORE user:${userId} +${delta}pts ` +
        `(streak: ${prevStreak}→${currentStreak})`,
      );

      return { userId, delta, operation: 'ADD_SCORE' };
    }

    case 'REMOVE_SCORE': {
      const { userId, streakBeforeUndo, streakAfterUndo } = job.data;

      if (job.id) {
        const redis = getRedisClient();
        const idempotencyKey = `processed:leaderboard:remove:${job.id}`;
        const acquired = await redis.setnx(idempotencyKey, '1');
        if (acquired === 0) {
          console.info(`[LeaderboardWorker] REMOVE_SCORE skipped (already processed): ${job.id}`);
          return { userId, delta: 0, operation: 'REMOVE_SCORE' };
        }
        // Keep the processed key for 30 days
        await redis.expire(idempotencyKey, 2592000);
      }

      // undoCheckInScore likewise throws on Redis failure — same reasoning.
      const delta = await undoCheckInScore(userId, streakBeforeUndo, streakAfterUndo);

      if (delta > 0) {
        emitLeaderboardUpdated();
      }

      console.info(
        `[LeaderboardWorker] REMOVE_SCORE user:${userId} -${delta}pts ` +
        `(streak: ${streakBeforeUndo}→${streakAfterUndo})`,
      );

      return { userId, delta: -delta, operation: 'REMOVE_SCORE' };
    }

    case 'SYNC_USER': {
      const { userId } = job.data;

      await syncLeaderboardFromDB(userId);

      console.info(`[LeaderboardWorker] SYNC_USER user:${userId} complete`);
      return { userId, delta: 0, operation: 'SYNC_USER' };
    }

    default: {
      const _exhaustive: never = job.data;
      throw new Error(
        `[LeaderboardWorker] Unknown job type: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────
export function createLeaderboardWorker(): Worker<
  LeaderboardJobData,
  LeaderboardJobResult
> {
  const worker = new Worker<LeaderboardJobData, LeaderboardJobResult>(
    QUEUE_NAMES.LEADERBOARD_RECOMPUTE,
    processLeaderboardJob,
    {
      connection:  getBullMQConnection(),
      concurrency: 10,
    },
  );

  worker.on('completed', (job, result) => {
    console.info(
      `[LeaderboardWorker] ✅ job:${job.id} completed — ` +
      `${result.operation} user:${result.userId} delta:${result.delta}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[LeaderboardWorker] ❌ job:${job?.id ?? '?'} failed — ` +
      `type:${job?.data?.type ?? '?'} ` +
      `attempt ${(job?.attemptsMade ?? 0) + 1}/5: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[LeaderboardWorker] worker error:', err.message);
  });

  return worker;
}
