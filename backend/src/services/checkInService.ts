import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import {
  toLocalDateString,
  dateStringToUTC,
  calculateStreaks,
  type StreakResult,
} from '../lib/streak';
import { cacheSet, cacheDel, CacheKey, TTL } from '../lib/cache';
import type { HabitCheckIn, Streak } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CheckInResponse {
  checkIn:     HabitCheckIn;
  streak:      Streak;
  streakStats: StreakResult;
}

export interface HistoryResponse {
  checkIns: HabitCheckIn[];
  pagination: {
    page:       number;
    pageSize:   number;
    total:      number;
    totalPages: number;
  };
  stats: {
    currentStreak:    number;
    longestStreak:    number;
    totalCompletions: number;
    lastCheckIn:      Date | null;
  };
}

// ─── POST /api/habits/:id/checkin ─────────────────────────────────────────────
//
// Flow:
//  1. Verify habit belongs to the requesting user (+ fetch user timezone).
//  2. Compute today's local date string → midnight UTC Date for DB storage.
//  3. Attempt to create the check-in inside a transaction:
//       a. INSERT HabitCheckIn — DB @@unique catches duplicates (→ P2002 → 409)
//       b. SELECT all check-in dates for this habit (streak recalculation)
//       c. Run calculateStreaks()
//       d. UPSERT Streak record
//       e. Emit STREAK_MILESTONE activity if applicable
//  4. After the transaction commits, update Redis cache (best-effort):
//       - WRITE  habit:{habitId}:streak  ← updated streak record
//       - DEL    user:{userId}:streaks   ← stale user-level summary
//       - DEL    user:{userId}:dashboard ← embedded streak data is now stale
//  5. Return check-in + updated streak + stats.
//
// Cache strategy:
//   The dashboard cache (user:{id}:dashboard) embeds streak data via Prisma
//   include. When a check-in happens we invalidate it so the next GET /habits
//   goes through to PostgreSQL and gets the fresh value. The habit-level streak
//   cache is written immediately so GET /habits/:id/history gets a cache hit.
// ─────────────────────────────────────────────────────────────────────────────
export async function createCheckIn(
  habitId: string,
  userId:  string,
  note?:   string,
): Promise<CheckInResponse> {
  // 1. Ownership check + fetch user timezone in parallel
  const [habit, user] = await Promise.all([
    prisma.habit.findFirst({ where: { id: habitId, userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  if (!habit) throw new AppError('Habit not found', 404);
  if (!user)  throw new AppError('User not found',  404);

  // 2. Compute today's calendar date in the user's timezone
  const todayStr      = toLocalDateString(new Date(), user.timezone);
  const completedDate = dateStringToUTC(todayStr);

  // 3. Transaction
  let result: CheckInResponse;
  try {
    result = await prisma.$transaction(async (tx) => {
      // INSERT — throws P2002 on duplicate → caught below
      const checkIn = await tx.habitCheckIn.create({
        data: {
          habitId,
          userId,          // denormalised — always from JWT, never client body
          completedDate,   // server-computed from user timezone
          note: note ?? null,
        },
      });

      // Recalculate streaks from all existing check-ins
      const allDates = await tx.habitCheckIn.findMany({
        where:   { habitId },
        select:  { completedDate: true },
        orderBy: { completedDate: 'asc' },
      });

      const streakStats = calculateStreaks(
        allDates.map((d) => d.completedDate),
        user.timezone,
      );

      // Upsert streak record
      const streak = await tx.streak.upsert({
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
          // calculateStreaks() already preserves historical maximum —
          // assigning directly is correct.
          longestStreak: streakStats.longestStreak,
          lastCheckIn:   streakStats.lastCheckIn,
        },
      });

      // Emit HABIT_CHECKED_IN activity — visible in friends' feeds
      await tx.activity.create({
        data: {
          userId,
          habitId,
          activityType: 'HABIT_CHECKED_IN',
          metadata: {
            habitTitle:    habit.title,
            completedDate: todayStr,
          },
        },
      });

      // Emit activity for milestone streaks (7, 30, 100, 365 days)
      const milestones = [7, 30, 100, 365];
      if (milestones.includes(streakStats.currentStreak)) {
        await tx.activity.create({
          data: {
            userId,
            habitId,
            activityType: 'STREAK_MILESTONE',
            metadata: {
              milestone:  streakStats.currentStreak,
              habitTitle: habit.title,
            },
          },
        });
      }

      return { checkIn, streak, streakStats };
    });
  } catch (err: unknown) {
    // Prisma unique constraint violation → duplicate check-in
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === 'P2002') {
      throw new AppError('Already checked in for today', 409);
    }
    throw err;
  }

  // 4. Cache — best-effort, outside transaction so we never cache uncommitted data.
  //    DEL is awaited so no subsequent GET can serve stale data in the response gap.
  //    cacheSet is fire-and-forget — a missed write causes one extra DB read, not corruption.
  await cacheDel(
    CacheKey.streaks(userId),
    CacheKey.dashboard(userId, false),
    CacheKey.dashboard(userId, true),
  );
  void cacheSet(CacheKey.habitStreak(result.checkIn.habitId), result.streak, TTL.HABIT_STREAK);

  return result;
}

// ─── GET /api/habits/:id/history ─────────────────────────────────────────────
//
// Returns paginated check-ins with aggregate stats.
// Streak stats come from the pre-computed Streak record (fast O(1) read).
// ─────────────────────────────────────────────────────────────────────────────
export async function getHabitHistory(
  habitId:  string,
  userId:   string,
  page:     number,
  pageSize: number,
): Promise<HistoryResponse> {
  // Ownership check — throws 404 if not owner
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new AppError('Habit not found', 404);

  const skip  = (page - 1) * pageSize;
  const total = await prisma.habitCheckIn.count({ where: { habitId } });

  const checkIns = await prisma.habitCheckIn.findMany({
    where:   { habitId },
    orderBy: { completedDate: 'desc' },
    skip,
    take: pageSize,
  });

  // Stats from pre-computed Streak record — O(1)
  const streak = await prisma.streak.findUnique({ where: { habitId } });

  return {
    checkIns,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    stats: {
      currentStreak:    streak?.currentStreak    ?? 0,
      longestStreak:    streak?.longestStreak    ?? 0,
      totalCompletions: total,
      lastCheckIn:      streak?.lastCheckIn      ?? null,
    },
  };
}

// ─── DELETE /api/habits/:id/checkin/today ─────────────────────────────────────
// Undo today's check-in (within the same calendar day in user's timezone only).
// Recalculates streak after removal.
//
// Cache strategy:
//   After the transaction commits, invalidate all affected cache keys:
//   - habit:{habitId}:streak   ← per-habit streak is now stale
//   - user:{userId}:streaks    ← user-level summary is stale
//   - user:{userId}:dashboard  ← embedded streak in habit list is stale
// ─────────────────────────────────────────────────────────────────────────────
export async function undoTodayCheckIn(
  habitId: string,
  userId:  string,
): Promise<{ streak: Streak }> {
  const [habit, user] = await Promise.all([
    prisma.habit.findFirst({ where: { id: habitId, userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
  ]);

  if (!habit) throw new AppError('Habit not found', 404);
  if (!user)  throw new AppError('User not found',  404);

  const todayStr      = toLocalDateString(new Date(), user.timezone);
  const completedDate = dateStringToUTC(todayStr);

  const result = await prisma.$transaction(async (tx) => {
    // Delete today's check-in
    const deleted = await tx.habitCheckIn.deleteMany({
      where: { habitId, completedDate },
    });

    if (deleted.count === 0) {
      throw new AppError('No check-in found for today', 404);
    }

    // Recalculate streaks from remaining check-ins
    const allDates = await tx.habitCheckIn.findMany({
      where:   { habitId },
      select:  { completedDate: true },
      orderBy: { completedDate: 'asc' },
    });

    const streakStats = calculateStreaks(
      allDates.map((d) => d.completedDate),
      user.timezone,
    );

    const streak = await tx.streak.update({
      where: { habitId },
      data: {
        currentStreak: streakStats.currentStreak,
        // longestStreak intentionally not reduced on undo (preserve historical best)
        lastCheckIn:   streakStats.lastCheckIn,
      },
    });

    return { streak };
  });

  // Cache invalidation — await DEL before return to close the stale-serve race window.
  // cacheSet not needed here (undo reduces streak; next GET will repopulate from DB).
  await cacheDel(
    CacheKey.habitStreak(habitId),
    CacheKey.streaks(userId),
    CacheKey.dashboard(userId, false),
    CacheKey.dashboard(userId, true),
  );

  return result;
}
