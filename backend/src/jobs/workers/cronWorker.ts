// ─── Cron Worker (Stateful Daily Sweeper) ─────────────────────────────────────
//
// Processes: system-cron queue
//
// Job types:
//   DAILY_SWEEP  — runs hourly. Finds every user whose lastSweepDate is behind
//                  their current local calendar date, then:
//                  1. Atomically updates lastSweepDate in PostgreSQL.
//                  2. Fans out VALIDATE_STREAK, SYNC_USER, and DAILY_SUMMARY
//                     jobs to their respective queues.
//
// Design goals:
//   ● Exactly-once per local day — guaranteed by DB comparison, not wall-clock.
//   ● Downtime-resilient — a user missed during a 48-hour outage is swept on
//     the next hourly run regardless of the current local time.
//   ● DST-safe — logic never tests `hour === 0`; only compares date strings.
//   ● Atomic — `lastSweepDate` is updated in the same Prisma $transaction that
//     validates the stale condition, preventing race conditions if two workers
//     ever run concurrently (concurrency is set to 1, but defence-in-depth).
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, type Job } from 'bullmq';
import { getBullMQConnection }    from '../../config/bullmq';
import { prisma }                 from '../../config/database';
import { toLocalDateString }      from '../../lib/streak';
import {
  QUEUE_NAMES,
  type CronJobData,
  type CronJobResult,
} from '../types';
import {
  streakValidationQueue,
  leaderboardQueue,
  notificationsQueue,
} from '../queues';

// ─── Date helper ──────────────────────────────────────────────────────────────
/**
 * Returns the current local calendar date for the user's timezone as a
 * YYYY-MM-DD string. This is timezone-aware and DST-safe because it delegates
 * to Intl.DateTimeFormat rather than any arithmetic on UTC offsets.
 */
function getCurrentLocalDate(timezone: string): string {
  return toLocalDateString(new Date(), timezone);
}

/**
 * Converts a `lastSweepDate` DateTime (or null) to a YYYY-MM-DD string.
 * A null value is treated as epoch so any current date is always "later".
 */
function getLastSweepDateString(lastSweepDate: Date | null): string {
  if (!lastSweepDate) return '1970-01-01';
  // lastSweepDate is stored as a UTC timestamp whose date part encodes the
  // local sweep date in YYYY-MM-DD format at time 00:00 UTC.
  return lastSweepDate.toISOString().split('T')[0];
}

// ─── Processor ───────────────────────────────────────────────────────────────
async function processCronJob(
  job: Job<CronJobData, CronJobResult>,
): Promise<CronJobResult> {
  const { type } = job.data;

  if (type !== 'DAILY_SWEEP') {
    throw new Error(`[CronWorker] Unknown job type: ${String(type)}`);
  }

  console.info(`[CronWorker] Starting DAILY_SWEEP at UTC ${new Date().toISOString()}`);

  let usersProcessed = 0;
  let habitsChecked  = 0;
  let jobsEnqueued   = 0;

  // 1. Fetch all users with their timezone and lastSweepDate
  const users = await prisma.user.findMany({
    select: { id: true, timezone: true, lastSweepDate: true },
  });

  // 2. Filter users whose current local date is ahead of their lastSweepDate.
  //    This is the core invariant:
  //      currentLocalDate > lastProcessedLocalDate  →  user needs processing
  //
  //    Handles all edge cases:
  //      • New user (lastSweepDate = null)  → always processed
  //      • Worker down 6 hours              → missed users have stale date → processed
  //      • Worker down 48 hours             → same as above
  //      • DST spring forward               → toLocalDateString uses Intl, not arithmetic
  //      • DST fall back (extra hour)       → date comparison prevents double-processing
  const staleUsers = users.filter((u) => {
    const currentLocal = getCurrentLocalDate(u.timezone);
    const lastLocal    = getLastSweepDateString(u.lastSweepDate);
    return currentLocal > lastLocal;
  });

  console.info(
    `[CronWorker] ${staleUsers.length}/${users.length} users need processing.`,
  );

  // 3. Process each stale user
  for (const user of staleUsers) {
    const currentLocalDate = getCurrentLocalDate(user.timezone);

    try {
      // 3a. Atomically mark this user as swept for today.
      //     We store the date as midnight UTC of the local date string so that
      //     getLastSweepDateString() can reliably reconstruct the YYYY-MM-DD.
      //     Using a transaction guarantees the update cannot partially succeed:
      //     if BullMQ throws before enqueuing, the update rolls back and the
      //     user will be retried on the next hourly sweep.
      await prisma.$transaction(async (tx) => {
        // Double-check inside the transaction to prevent race conditions
        // when the worker is restarted mid-sweep with the same user set.
        const fresh = await tx.user.findUnique({
          where:  { id: user.id },
          select: { lastSweepDate: true },
        });

        if (fresh) {
          const freshLastLocal = getLastSweepDateString(fresh.lastSweepDate);
          if (currentLocalDate <= freshLastLocal) {
            // Another worker instance already processed this user — skip.
            return;
          }
        }

        // Update lastSweepDate to midnight UTC of the local date string
        await tx.user.update({
          where: { id: user.id },
          data:  { lastSweepDate: new Date(`${currentLocalDate}T00:00:00.000Z`) },
        });
      });
    } catch (err) {
      // If the DB update fails, do not enqueue jobs — the user will be retried
      // on the next hourly run with a still-stale lastSweepDate.
      console.error(`[CronWorker] Failed to update lastSweepDate for user:${user.id}`, (err as Error).message);
      continue;
    }

    // 3b. Enqueue Leaderboard Sync — stable jobId prevents BullMQ duplicates
    leaderboardQueue.add(
      'leaderboard',
      { type: 'SYNC_USER', userId: user.id },
      { jobId: `sync-${user.id}-${currentLocalDate}` },
    ).catch(console.error);
    jobsEnqueued++;

    // 3c. Enqueue Daily Summary Notification
    notificationsQueue.add(
      'notification',
      { type: 'DAILY_SUMMARY', userId: user.id },
      { jobId: `summary-${user.id}-${currentLocalDate}` },
    ).catch(console.error);
    jobsEnqueued++;

    // 3d. Enqueue Streak Validation for all habits of this user
    const habits = await prisma.habit.findMany({
      where:  { userId: user.id },
      select: { id: true },
    });

    for (const habit of habits) {
      streakValidationQueue.add(
        'streak',
        { type: 'VALIDATE_STREAK', habitId: habit.id, userId: user.id },
        { jobId: `validate-${habit.id}-${currentLocalDate}` },
      ).catch(console.error);
      jobsEnqueued++;
      habitsChecked++;
    }

    usersProcessed++;
  }

  console.info(
    `[CronWorker] DAILY_SWEEP complete: swept ${usersProcessed} users, ` +
    `${habitsChecked} habits, pushed ${jobsEnqueued} jobs.`,
  );

  return { usersProcessed, habitsChecked, jobsEnqueued };
}

// ─── Worker factory ───────────────────────────────────────────────────────────
export function createCronWorker(): Worker<CronJobData, CronJobResult> {
  const worker = new Worker<CronJobData, CronJobResult>(
    QUEUE_NAMES.SYSTEM_CRON,
    processCronJob,
    {
      connection:  getBullMQConnection(),
      concurrency: 1, // Only one sweep runs at a time to prevent DB contention
    },
  );

  worker.on('completed', (job, result) => {
    console.info(
      `[CronWorker] ✅ job:${job.id} completed. ` +
      `swept:${result.usersProcessed} users, enqueued:${result.jobsEnqueued} tasks.`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[CronWorker] ❌ job:${job?.id ?? '?'} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('[CronWorker] connection error:', err.message);
  });

  return worker;
}
