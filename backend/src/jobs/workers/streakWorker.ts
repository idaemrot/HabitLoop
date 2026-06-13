// ─── Streak Validation Worker ─────────────────────────────────────────────────
//
// Processes: streak-validation queue
//
// Job types:
//   VALIDATE_STREAK — recalculates a habit's streak from PostgreSQL and
//                     writes the corrected record back.
//
// Use cases:
//   • Daily sweep cron: ensure streaks are reset after a missed day.
//   • Post-timezone-change repair: user changed timezone, recalculate.
//   • Admin-triggered repair via POST /api/jobs/streak-validation.
//
// Resilience:
//   • Worker is sandboxed in its own function scope.
//   • All thrown errors propagate to BullMQ for retry accounting.
//   • After 5 failed attempts the job moves to the failed state (dead-letter).
//   • Worker failure does NOT affect the HTTP server process.
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, type Job } from 'bullmq';
import { getBullMQConnection } from '../config/bullmq';
import { prisma } from '../config/database';
import { calculateStreaks } from '../lib/streak';
import { cacheDel, CacheKey } from '../lib/cache';
import {
  QUEUE_NAMES,
  type StreakValidationJobData,
  type StreakValidationJobResult,
} from './types';

// ─── Processor ───────────────────────────────────────────────────────────────
async function processStreakValidation(
  job: Job<StreakValidationJobData, StreakValidationJobResult>,
): Promise<StreakValidationJobResult> {
  const { type, habitId, userId } = job.data;

  if (type !== 'VALIDATE_STREAK') {
    throw new Error(`[StreakWorker] Unknown job type: ${String(type)}`);
  }

  await job.updateProgress(10);

  // Fetch user timezone
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { timezone: true },
  });
  if (!user) throw new Error(`[StreakWorker] User ${userId} not found`);

  await job.updateProgress(30);

  // Fetch all check-in dates for this habit in ascending order
  const allDates = await prisma.habitCheckIn.findMany({
    where:   { habitId },
    select:  { completedDate: true },
    orderBy: { completedDate: 'asc' },
  });

  await job.updateProgress(60);

  // Recalculate authoritative streak values
  const streakStats = calculateStreaks(
    allDates.map((d) => d.completedDate),
    user.timezone,
  );

  // Fetch current DB record to detect whether repair is needed
  const existing = await prisma.streak.findUnique({ where: { habitId } });
  const repaired =
    existing?.currentStreak !== streakStats.currentStreak ||
    existing?.longestStreak !== streakStats.longestStreak;

  if (repaired || !existing) {
    await prisma.streak.upsert({
      where:  { habitId },
      create: {
        habitId,
        userId,
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        lastCheckIn:   streakStats.lastCheckIn,
      },
      update: {
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        lastCheckIn:   streakStats.lastCheckIn,
      },
    });

    // Invalidate Redis cache so the next GET sees the corrected data
    await cacheDel(
      CacheKey.habitStreak(habitId),
      CacheKey.streaks(userId),
      CacheKey.dashboard(userId, false),
      CacheKey.dashboard(userId, true),
    );
  }

  await job.updateProgress(100);

  console.info(
    `[StreakWorker] habit:${habitId} → streak=${streakStats.currentStreak} ` +
    `(repaired=${repaired})`,
  );

  return {
    habitId,
    currentStreak: streakStats.currentStreak,
    longestStreak: streakStats.longestStreak,
    repaired,
  };
}

// ─── Worker factory ───────────────────────────────────────────────────────────
export function createStreakValidationWorker(): Worker<
  StreakValidationJobData,
  StreakValidationJobResult
> {
  const worker = new Worker<StreakValidationJobData, StreakValidationJobResult>(
    QUEUE_NAMES.STREAK_VALIDATION,
    processStreakValidation,
    {
      connection: getBullMQConnection(),
      concurrency: 5,   // process up to 5 habits simultaneously
    },
  );

  worker.on('completed', (job, result) => {
    console.info(
      `[StreakWorker] ✅ job:${job.id} completed — ` +
      `habit:${result.habitId} streak=${result.currentStreak}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[StreakWorker] ❌ job:${job?.id ?? '?'} failed — ` +
      `attempt ${(job?.attemptsMade ?? 0) + 1}: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    // Connection-level errors (not job-level)
    console.error('[StreakWorker] worker error:', err.message);
  });

  return worker;
}
