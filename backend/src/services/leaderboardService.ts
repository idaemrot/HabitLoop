/**
 * ─── Leaderboard Service ───────────────────────────────────────────────────────
 *
 * Redis Sorted Set design:
 *
 *   Key                  Member    Score
 *   ──────────────────   ───────   ─────────────────────────────────────────────
 *   leaderboard:weekly   userId    total points accrued this ISO-week (Mon–Sun)
 *   leaderboard:monthly  userId    total points accrued this calendar month
 *   leaderboard:alltime  userId    cumulative total points ever
 *
 * Score lifecycle — CHECK-IN:
 *   +10   always (base completion)
 *   +50   once when currentStreak crosses 7 for the first time in a streak run
 *   +200  once when currentStreak crosses 30 for the first time in a streak run
 *
 * Score lifecycle — UNDO:
 *   -10   always (base completion reversal)
 *   -50   only when the undo causes streak to DROP BELOW 7 (milestone revoked)
 *   -200  only when the undo causes streak to DROP BELOW 30 (milestone revoked)
 *   Scores are clamped to 0 — a user can never have a negative leaderboard score.
 *
 * Milestone idempotency:
 *   Award:  prevStreak < N && currentStreak >= N   → bonus given once per streak run.
 *   Revoke: streakAfterUndo < N && streakBeforeUndo >= N → bonus revoked once per undo.
 *   This prevents the point-farming exploit (check-in at day 7, undo, re-check-in).
 *
 * Failure contract:
 *   Every exported function NEVER throws. Redis errors are caught and logged.
 *   Callers use void + .catch so the HTTP response is never blocked or broken.
 *   ── BullMQ Integration Points ──
 *   Both applyCheckInScore and undoCheckInScore are called fire-and-forget by
 *   checkInService. In Task 11, these call sites will be replaced with:
 *     queue.add('leaderboard', { type: 'ADD' | 'REMOVE', userId, ... })
 *   The BullMQ worker will call these functions with automatic retry on Redis failure,
 *   eliminating silent point-loss on Redis downtime.
 *
 * Complexity:
 *   ZINCRBY    O(log N)
 *   ZREVRANK   O(log N)
 *   ZREVRANGE  O(log N + M)  where M = number of entries returned
 *
 * Key expiry / TTL:
 *   leaderboard:weekly   expires at the end of the current ISO-week
 *   leaderboard:monthly  expires at the end of the current calendar month
 *   leaderboard:alltime  no expiry (persistent sorted set; recomputable from DB)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getRedisClient }  from '../config/redis';
import { prisma }          from '../config/database';

// ─── Redis key constants ──────────────────────────────────────────────────────
export const LEADERBOARD_KEY = {
  weekly:  'leaderboard:weekly',
  monthly: 'leaderboard:monthly',
  alltime: 'leaderboard:alltime',
} as const;

export type LeaderboardPeriod = keyof typeof LEADERBOARD_KEY;

// ─── Scoring constants ────────────────────────────────────────────────────────
const BASE_SCORE        = 10;
const MILESTONE_7_BONUS = 50;
const MILESTONE_30_BONUS = 200;

// ─── TTL helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the number of whole seconds until the end of the current ISO-week
 * (Sunday 23:59:59 UTC). Used to auto-expire the weekly sorted set.
 */
function secondsUntilEndOfWeek(): number {
  const now  = new Date();
  // getDay() returns 0=Sun … 6=Sat; ISO week ends on Sunday evening.
  // Days until Sunday: (7 - getDay()) % 7, or 7 if today is already Sunday.
  const day  = now.getUTCDay();                // 0=Sun, 1=Mon … 6=Sat
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  const endOfWeek = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilSunday,
    23, 59, 59,
  ));
  return Math.max(1, Math.floor((endOfWeek.getTime() - now.getTime()) / 1000));
}

/**
 * Returns the number of whole seconds until midnight UTC on the first day of
 * next month. Used to auto-expire the monthly sorted set.
 */
function secondsUntilEndOfMonth(): number {
  const now        = new Date();
  const nextMonth  = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1, // JS Date rolls over gracefully
    1, 0, 0, 0,
  ));
  return Math.max(1, Math.floor((nextMonth.getTime() - now.getTime()) / 1000));
}

// ─── applyCheckInScore ────────────────────────────────────────────────────────
/**
 * Called AFTER the PostgreSQL check-in transaction has committed.
 * Computes the score delta for this check-in and increments all three
 * leaderboard sorted sets atomically via pipelining.
 *
 * @param userId         - The user who checked in (sorted-set member).
 * @param prevStreak     - The streak value BEFORE this check-in.
 * @param currentStreak  - The streak value AFTER this check-in.
 *
 * Returns the total delta awarded (useful for logging / testing).
 * Never throws.
 */
export async function applyCheckInScore(
  userId:        string,
  currentStreak: number,
  prevStreak     = 0,           // defaults to 0 if caller doesn't have it
): Promise<number> {
  try {
    // 1. Compute delta
    let delta = BASE_SCORE;

    // Milestone +50: streak crossed 7 this check-in
    if (prevStreak < 7 && currentStreak >= 7) {
      delta += MILESTONE_7_BONUS;
    }

    // Milestone +200: streak crossed 30 this check-in
    if (prevStreak < 30 && currentStreak >= 30) {
      delta += MILESTONE_30_BONUS;
    }

    // 2. ZINCRBY all three boards in a single pipeline (one round-trip)
    const redis    = getRedisClient();
    const pipeline = redis.pipeline();

    pipeline.zincrby(LEADERBOARD_KEY.alltime, delta, userId);

    // Weekly — increment then ensure TTL is set
    pipeline.zincrby(LEADERBOARD_KEY.weekly, delta, userId);
    pipeline.expire(LEADERBOARD_KEY.weekly, secondsUntilEndOfWeek());

    // Monthly — increment then ensure TTL is set
    pipeline.zincrby(LEADERBOARD_KEY.monthly, delta, userId);
    pipeline.expire(LEADERBOARD_KEY.monthly, secondsUntilEndOfMonth());

    await pipeline.exec();

    console.info(
      `[Leaderboard] +${delta} for user ${userId} ` +
      `(streak: ${prevStreak}→${currentStreak}, ` +
      `base:${BASE_SCORE}` +
      (prevStreak < 7 && currentStreak >= 7 ? ` +milestone7:${MILESTONE_7_BONUS}` : '') +
      (prevStreak < 30 && currentStreak >= 30 ? ` +milestone30:${MILESTONE_30_BONUS}` : '') +
      ')',
    );

    return delta;
  } catch (err: unknown) {
    console.error('[Leaderboard] applyCheckInScore error:', (err as Error).message);
    return 0; // never throw — leaderboard failure must not break check-in
  }
}

// ─── LeaderboardEntry type ────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank:     number;           // 1-indexed
  userId:   string;
  username: string;
  avatarUrl: string | null;
  score:    number;
}

// ─── getLeaderboard ───────────────────────────────────────────────────────────
/**
 * Returns the top `limit` entries for the given period, ranked by score desc.
 *
 * Algorithm:
 *   1. ZREVRANGE key 0 (limit-1) WITHSCORES  →  [member, score, member, score…]
 *   2. Batch-lookup usernames from PostgreSQL (single IN query, not N+1)
 *   3. Merge and return
 *
 * Complexity: O(log N + M)  where M = limit
 */
export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit   = 50,
): Promise<LeaderboardEntry[]> {
  try {
    const redis = getRedisClient();
    const key   = LEADERBOARD_KEY[period];

    // ZREVRANGE returns: [member0, score0, member1, score1, ...]
    const raw = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES');

    if (raw.length === 0) return [];

    // Parse into [(userId, score)] pairs
    const pairs: Array<{ userId: string; score: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      pairs.push({ userId: raw[i]!, score: parseFloat(raw[i + 1]!) });
    }

    const userIds = pairs.map((p) => p.userId);

    // Single PostgreSQL query — never N+1
    const users = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Merge: preserve Redis rank order (Redis is source of truth for ranking)
    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const { userId, score } = pairs[i]!;
      const user = userMap.get(userId);
      if (!user) continue;  // user deleted — skip gracefully
      entries.push({
        rank:     i + 1,
        userId,
        username:  user.username,
        avatarUrl: user.avatarUrl,
        score,
      });
    }

    return entries;
  } catch (err: unknown) {
    console.error('[Leaderboard] getLeaderboard error:', (err as Error).message);
    return [];   // Redis down → return empty leaderboard, never throw
  }
}

// ─── getUserRank ──────────────────────────────────────────────────────────────
/**
 * Returns the rank and score for a single user in a given period.
 *
 * Uses ZREVRANK (O(log N)) + ZSCORE (O(1)) — two pipelined commands.
 *
 * Returns null if the user has no score in this leaderboard yet.
 */
export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod,
): Promise<{ rank: number; score: number } | null> {
  try {
    const redis = getRedisClient();
    const key   = LEADERBOARD_KEY[period];

    const pipeline = redis.pipeline();
    pipeline.zrevrank(key, userId);   // null if not present; 0-indexed
    pipeline.zscore(key, userId);     // null if not present

    const results = await pipeline.exec();
    if (!results) return null;

    const rankRaw  = results[0]?.[1] as number | null;
    const scoreRaw = results[1]?.[1] as string | null;

    if (rankRaw === null || scoreRaw === null) return null;

    return {
      rank:  rankRaw + 1,             // convert 0-indexed to 1-indexed
      score: parseFloat(scoreRaw),
    };
  } catch (err: unknown) {
    console.error('[Leaderboard] getUserRank error:', (err as Error).message);
    return null;
  }
}

// ─── undoCheckInScore ─────────────────────────────────────────────────────────
/**
 * Called AFTER the PostgreSQL undo-check-in transaction commits.
 * Computes the score DEDUCTION for the reversed check-in and decrements all
 * three leaderboard sorted sets.
 *
 * Deduction logic mirrors applyCheckInScore exactly:
 *   -10  always (base completion reversal)
 *   -50  only when streakAfterUndo < 7 ≤ streakBeforeUndo  (milestone revoked)
 *   -200 only when streakAfterUndo < 30 ≤ streakBeforeUndo (milestone revoked)
 *
 * Scores are clamped to 0 after deduction — a user can never go negative.
 *
 * ── BullMQ Integration Point ─────────────────────────────────────────────────
 * In Task 11, the caller (undoTodayCheckIn) should push:
 *   queue.add('leaderboard', { type: 'REMOVE', userId, streakBeforeUndo, streakAfterUndo })
 * The worker then calls this function with automatic retry on Redis failure,
 * eliminating the current silent-loss risk.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param userId           - The user who undid the check-in.
 * @param streakBeforeUndo - Streak WITH today's check-in (before deletion).
 * @param streakAfterUndo  - Streak WITHOUT today's check-in (after deletion).
 *
 * Returns the total delta deducted. Never throws.
 */
export async function undoCheckInScore(
  userId:           string,
  streakBeforeUndo: number,
  streakAfterUndo:  number,
): Promise<number> {
  try {
    // Mirror the award formula exactly — compute what was given for that check-in
    let delta = BASE_SCORE;

    // Milestone -50: undo drops streak back below 7
    if (streakAfterUndo < 7 && streakBeforeUndo >= 7) {
      delta += MILESTONE_7_BONUS;
    }

    // Milestone -200: undo drops streak back below 30
    if (streakAfterUndo < 30 && streakBeforeUndo >= 30) {
      delta += MILESTONE_30_BONUS;
    }

    const redis    = getRedisClient();
    const pipeline = redis.pipeline();

    pipeline.zincrby(LEADERBOARD_KEY.alltime,  -delta, userId);
    pipeline.zincrby(LEADERBOARD_KEY.weekly,   -delta, userId);
    pipeline.zincrby(LEADERBOARD_KEY.monthly,  -delta, userId);

    const results = await pipeline.exec();

    // Clamp any board that went negative → 0.
    // Two-step (non-atomic) is acceptable here: a brief negative value is cosmetic.
    // Task 11 BullMQ worker will wrap this in a Lua script for atomic clamp.
    if (results) {
      const keyOrder = [
        LEADERBOARD_KEY.alltime,
        LEADERBOARD_KEY.weekly,
        LEADERBOARD_KEY.monthly,
      ] as const;
      const clampPipeline = redis.pipeline();
      let needsClamp = false;

      for (let i = 0; i < keyOrder.length; i++) {
        const score = parseFloat(String(results[i]?.[1] ?? '0'));
        if (score < 0) {
          clampPipeline.zadd(keyOrder[i]!, 0, userId);
          needsClamp = true;
        }
      }

      if (needsClamp) await clampPipeline.exec();
    }

    console.info(
      `[Leaderboard] -${delta} for user ${userId} ` +
      `(undo: streak ${streakBeforeUndo}→${streakAfterUndo}` +
      (streakAfterUndo < 7  && streakBeforeUndo >= 7  ? ` -milestone7:${MILESTONE_7_BONUS}` : '') +
      (streakAfterUndo < 30 && streakBeforeUndo >= 30 ? ` -milestone30:${MILESTONE_30_BONUS}` : '') +
      ')',
    );

    return delta;
  } catch (err: unknown) {
    console.error('[Leaderboard] undoCheckInScore error:', (err as Error).message);
    return 0; // never throw
  }
}

// ─── RecomputeResult type ─────────────────────────────────────────────────────
export interface RecomputeResult {
  /** Authoritative alltime score derived entirely from PostgreSQL data. */
  totalScore: number;
  breakdown: Array<{
    habitId:  string;
    checkIns: number;
    points:   number;
  }>;
}

// ─── recomputeUserScore ───────────────────────────────────────────────────────
/**
 * Recomputes a user's authoritative alltime leaderboard score entirely from
 * PostgreSQL data. This is the single source of truth the Redis score should
 * reflect.
 *
 * Algorithm:
 *   For each habit, replay all check-ins in chronological order:
 *     - Detect consecutive days (completedDate is stored as UTC midnight).
 *     - Award +10 per completion.
 *     - Award +50 when streak first crosses 7 in a continuous run.
 *     - Award +200 when streak first crosses 30 in a continuous run.
 *
 * Limitations:
 *   Weekly/monthly scores CANNOT be recomputed from the DB alone — the DB does
 *   not store which ISO-week or calendar-month a score belonged to. Only the
 *   alltime board is recomputable. Weekly/monthly boards self-heal via TTL expiry.
 *
 * Use cases:
 *   (a) Manual repair after Redis outage causes silent point-loss.
 *   (b) Assertion baseline in integration tests.
 *   (c) BullMQ reconciliation job in Task 11.
 */
export async function recomputeUserScore(userId: string): Promise<RecomputeResult> {
  // 1. All check-ins across all habits for this user, in date order
  const checkIns = await prisma.habitCheckIn.findMany({
    where:   { userId },
    orderBy: { completedDate: 'asc' },
    select:  { habitId: true, completedDate: true },
  });

  // 2. Group by habitId (each habit has an independent streak)
  const byHabit = new Map<string, Date[]>();
  for (const ci of checkIns) {
    if (!byHabit.has(ci.habitId)) byHabit.set(ci.habitId, []);
    byHabit.get(ci.habitId)!.push(ci.completedDate);
  }

  // 3. Simulate scoring per habit, replicating applyCheckInScore logic
  const breakdown: RecomputeResult['breakdown'] = [];
  let totalScore = 0;
  const MS_PER_DAY = 86_400_000;

  for (const [habitId, dates] of byHabit) {
    let points     = 0;
    let prevStreak = 0;
    let prevDate: Date | null = null;

    for (const date of dates) {
      // completedDate is always UTC midnight — consecutive = exactly 1 day apart
      const diffDays = prevDate
        ? Math.round((date.getTime() - prevDate.getTime()) / MS_PER_DAY)
        : 2; // first check-in is never consecutive

      const currentStreak = diffDays === 1 ? prevStreak + 1 : 1;

      points += BASE_SCORE;
      if (prevStreak < 7  && currentStreak >= 7)  points += MILESTONE_7_BONUS;
      if (prevStreak < 30 && currentStreak >= 30)  points += MILESTONE_30_BONUS;

      prevStreak = currentStreak;
      prevDate   = date;
    }

    breakdown.push({ habitId, checkIns: dates.length, points });
    totalScore += points;
  }

  return { totalScore, breakdown };
}

// ─── syncLeaderboardFromDB ────────────────────────────────────────────────────
/**
 * Repair function: recomputes a user's authoritative alltime score from
 * PostgreSQL and overwrites the Redis alltime sorted-set entry.
 *
 * Use after Redis outage or when DB↔Redis divergence is detected.
 * Weekly/monthly boards are intentionally NOT synced — see recomputeUserScore.
 *
 * Never throws.
 */
export async function syncLeaderboardFromDB(userId: string): Promise<void> {
  try {
    const { totalScore } = await recomputeUserScore(userId);
    const redis = getRedisClient();

    // ZADD overwrites unconditionally — deterministic given current DB state.
    await redis.zadd(LEADERBOARD_KEY.alltime, totalScore, userId);

    console.info(
      `[Leaderboard] synced alltime score for user ${userId}: ${totalScore} pts`,
    );
  } catch (err: unknown) {
    console.error('[Leaderboard] syncLeaderboardFromDB error:', (err as Error).message);
  }
}
