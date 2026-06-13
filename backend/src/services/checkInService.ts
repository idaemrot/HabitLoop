import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import {
  toLocalDateString,
  dateStringToUTC,
  calculateStreaks,
  type StreakResult,
} from '../lib/streak';
import type { HabitCheckIn, Streak } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CheckInResponse {
  checkIn:  HabitCheckIn;
  streak:   Streak;
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
//  1. Verify habit belongs to the requesting user.
//  2. Fetch user's timezone.
//  3. Compute today's local date string → midnight UTC Date for DB storage.
//  4. Attempt to create the check-in inside a transaction:
//       a. Insert HabitCheckIn (DB unique constraint catches dupe silently).
//       b. Fetch ALL check-in dates for streak recalculation.
//       c. Run calculateStreaks().
//       d. Update Streak record (upsert in case it was somehow missing).
//  5. Return check-in + updated streak + stats.
//
// Idempotency note:
//   If the user checks in twice on the same day the DB @@unique constraint
//   throws a Prisma P2002 error. We catch it and return a 409 with a
//   friendly message.
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
  const todayStr    = toLocalDateString(new Date(), user.timezone);
  const completedDate = dateStringToUTC(todayStr);

  try {
    return await prisma.$transaction(async (tx) => {
      // 3. Create check-in (throws P2002 on duplicate → caught below)
      const checkIn = await tx.habitCheckIn.create({
        data: {
          habitId,
          userId,                // denormalised — always from JWT, never client body
          completedDate,         // server-computed from user timezone
          note: note ?? null,
        },
      });

      // 4. Recalculate streaks from all existing check-ins
      const allDates = await tx.habitCheckIn.findMany({
        where:   { habitId },
        select:  { completedDate: true },
        orderBy: { completedDate: 'asc' },
      });

      const streakStats = calculateStreaks(
        allDates.map((d) => d.completedDate),
        user.timezone,
      );

      // 5. Upsert streak record
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
          longestStreak: Math.max(
            // Never reduce longestStreak — preserve historical best
            // (calculateStreaks already handles this, but explicit is safer)
            streakStats.longestStreak,
          ),
          lastCheckIn: streakStats.lastCheckIn,
        },
      });

      // 6. Emit activity for milestone streaks (7, 30, 100, 365 days)
      const milestones = [7, 30, 100, 365];
      if (milestones.includes(streakStats.currentStreak)) {
        await tx.activity.create({
          data: {
            userId,
            habitId,
            activityType: 'STREAK_MILESTONE',
            metadata: {
              milestone:    streakStats.currentStreak,
              habitTitle:   habit.title,
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
}

// ─── GET /api/habits/:id/history ─────────────────────────────────────────────
//
// Returns paginated check-ins with aggregate stats.
// Streak stats come from the pre-computed Streak record (fast O(1) read).
// Pagination is cursor-based on createdAt DESC (newest first).
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

  return prisma.$transaction(async (tx) => {
    // Delete today's check-in (throws if not found)
    const deleted = await tx.habitCheckIn.deleteMany({
      where: { habitId, completedDate },
    });

    if (deleted.count === 0) {
      throw new AppError('No check-in found for today', 404);
    }

    // Recalculate streaks
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
        // Never reduce longestStreak when undoing a check-in
        lastCheckIn:   streakStats.lastCheckIn,
      },
    });

    return { streak };
  });
}
