import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { withCache, cacheDel, CacheKey, TTL } from '../lib/cache';
import type { CreateHabitInput, UpdateHabitInput } from '../validators/habitValidators';
import type { Habit, Streak } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────
export type HabitWithStreak = Habit & { streak: Streak | null };

// ─── Ownership guard ──────────────────────────────────────────────────────────
// Reused by every mutating operation — throws 404 (not 403) to avoid confirming
// that a habit exists for another user.
async function assertOwnership(habitId: string, userId: string): Promise<Habit> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });
  if (!habit) throw new AppError('Habit not found', 404);
  return habit;
}

// ─── Get all habits for a user ────────────────────────────────────────────────
// Cache: user:{id}:dashboard:{active|all} — TTL 60s
// Fallback: PostgreSQL on cache miss or Redis error
export async function getUserHabits(
  userId: string,
  includeArchived = false,
): Promise<HabitWithStreak[]> {
  const key = CacheKey.dashboard(userId, includeArchived);
  return withCache(key, TTL.DASHBOARD, () =>
    prisma.habit.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      include: { streak: true },
      orderBy: [
        { isArchived: 'asc' },   // active first
        { createdAt: 'asc' },    // oldest habit first (stable order)
      ],
    }),
  );
}

// ─── Get single habit by ID ───────────────────────────────────────────────────
export async function getHabitById(
  habitId: string,
  userId: string,
): Promise<HabitWithStreak> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    include: { streak: true },
  });
  if (!habit) throw new AppError('Habit not found', 404);
  return habit;
}

// ─── Create habit ─────────────────────────────────────────────────────────────
export async function createHabit(
  userId: string,
  input: CreateHabitInput,
): Promise<HabitWithStreak> {
  const habit = await prisma.$transaction(async (tx) => {
    const created = await tx.habit.create({
      data: {
        userId,
        title:       input.title,
        description: input.description ?? null,
        frequency:   input.frequency ?? 'DAILY',
        color:       input.color    ?? '#6C5CE7',
        icon:        input.icon     ?? 'flame',
      },
      include: { streak: true },
    });

    // Initialise streak record immediately so the dashboard never needs a null check
    await tx.streak.create({
      data: {
        habitId:       created.id,
        userId,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    // Emit activity log entry
    await tx.activity.create({
      data: {
        userId,
        habitId:      created.id,
        activityType: 'HABIT_CREATED',
        metadata:     { title: created.title },
      },
    });

    // Re-fetch to include the newly created streak
    return tx.habit.findUniqueOrThrow({
      where:   { id: created.id },
      include: { streak: true },
    });
  });

  // Invalidate dashboard cache — both active and all-inclusive views
  await cacheDel(
    CacheKey.dashboard(userId, false),
    CacheKey.dashboard(userId, true),
  );

  return habit;
}

// ─── Update habit ─────────────────────────────────────────────────────────────
export async function updateHabit(
  habitId: string,
  userId: string,
  input: UpdateHabitInput,
): Promise<HabitWithStreak> {
  await assertOwnership(habitId, userId);

  // Emit activity log if archiving
  if (input.isArchived === true) {
    await prisma.activity.create({
      data: {
        userId,
        habitId,
        activityType: 'HABIT_ARCHIVED',
        metadata:     { habitId },
      },
    });
  }

  const habit = await prisma.habit.update({
    where: { id: habitId },
    data: {
      ...(input.title       !== undefined && { title:       input.title }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.frequency   !== undefined && { frequency:   input.frequency }),
      ...(input.color       !== undefined && { color:       input.color }),
      ...(input.icon        !== undefined && { icon:        input.icon }),
      ...(input.isArchived  !== undefined && { isArchived:  input.isArchived }),
    },
    include: { streak: true },
  });

  // Invalidate dashboard cache — title/icon/archive status is displayed there
  await cacheDel(
    CacheKey.dashboard(userId, false),
    CacheKey.dashboard(userId, true),
  );

  return habit;
}

// ─── Delete habit (hard delete — cascades to check-ins, streak, activities) ───
export async function deleteHabit(
  habitId: string,
  userId: string,
): Promise<void> {
  await assertOwnership(habitId, userId);
  await prisma.habit.delete({ where: { id: habitId } });

  // Invalidate dashboard cache + individual habit streak cache + user streak aggregate
  await cacheDel(
    CacheKey.dashboard(userId, false),
    CacheKey.dashboard(userId, true),
    CacheKey.habitStreak(habitId),
    CacheKey.streaks(userId),          // defensive: future streak aggregate must not include deleted habit
  );
}

// ─── Archive / unarchive (soft delete) ────────────────────────────────────────
export async function archiveHabit(
  habitId: string,
  userId: string,
  archived: boolean,
): Promise<HabitWithStreak> {
  return updateHabit(habitId, userId, { isArchived: archived });
  // Note: updateHabit already invalidates dashboard cache
}
