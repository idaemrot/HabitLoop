/**
 * ─── Cache Layer ──────────────────────────────────────────────────────────────
 *
 * Thin typed wrapper around ioredis that provides:
 *  - get<T>   : deserialise JSON or return null on miss/error
 *  - set<T>   : serialise + TTL, silently swallows write errors
 *  - del      : invalidate one or more keys, silently swallows errors
 *  - delPattern : scan + delete keys matching a glob (for bulk invalidation)
 *
 * Design principles:
 *  1. Redis is NEVER a single point of failure. Every public function catches
 *     all Redis errors and falls back to the caller's PostgreSQL path.
 *  2. Cache keys are defined as constants in this file — no magic strings
 *     scattered across services.
 *  3. TTLs are conservative to avoid serving stale data. Correctness >
 *     performance.
 *
 * Cache flow:
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Request                                                             │
 *   │    │                                                                 │
 *   │    ▼                                                                 │
 *   │  cache.get(key)                                                      │
 *   │    ├─ HIT  → return cached JSON (no DB query)                       │
 *   │    └─ MISS or Redis error                                            │
 *   │         │                                                            │
 *   │         ▼                                                            │
 *   │       PostgreSQL query (source of truth)                             │
 *   │         │                                                            │
 *   │         ▼                                                            │
 *   │       cache.set(key, data, ttl)   ← write-through                   │
 *   │         │                                                            │
 *   │         ▼                                                            │
 *   │       return data                                                    │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * Invalidation flow:
 *
 *   Mutation (check-in / create / update / delete / archive)
 *     │
 *     ├─ Perform DB write (transaction)
 *     └─ cache.del(affectedKeys)   ← best-effort, never throws
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getRedisClient } from '../config/redis';

// ─── Date reviver ─────────────────────────────────────────────────────────────
// JSON.stringify(date) → ISO string. JSON.parse gives back a string, not Date.
// This reviver detects ISO 8601 strings and reconstructs Date objects,
// keeping cached values type-identical to Prisma-returned objects.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}

// ─── Cache key templates ──────────────────────────────────────────────────────
// All keys follow the pattern: namespace:userId[:qualifier]
// Changing a template here updates every consumer.

export const CacheKey = {
  /**
   * Stores the full list of a user's habits including embedded streak data.
   * Used by GET /api/habits (active only and archived queries are separate entries).
   *
   * TTL: 60 seconds — habits list is cheap to recompute; short TTL keeps it fresh.
   *
   * Invalidated by: createHabit, updateHabit, deleteHabit, archiveHabit
   */
  dashboard: (userId: string, includeArchived: boolean): string =>
    `user:${userId}:dashboard:${includeArchived ? 'all' : 'active'}`,

  /**
   * Stores the aggregated streak statistics for all of a user's habits.
   * Used by the dashboard stats bar (total streak, best streak, done today).
   *
   * TTL: 30 seconds — streak data changes on every check-in; short TTL.
   *
   * Invalidated by: createCheckIn, undoTodayCheckIn
   */
  streaks: (userId: string): string =>
    `user:${userId}:streaks`,

  /**
   * Stores the streak record for a single habit.
   *
   * TTL: 30 seconds
   *
   * Invalidated by: createCheckIn, undoTodayCheckIn for that habit.
   */
  habitStreak: (habitId: string): string =>
    `habit:${habitId}:streak`,
} as const;

// ─── TTLs (seconds) ───────────────────────────────────────────────────────────
export const TTL = {
  DASHBOARD:    60,   // habit list — 1 minute
  STREAKS:      30,   // user streak summary — 30 seconds
  HABIT_STREAK: 30,   // single habit streak — 30 seconds
} as const;

// ─── get<T> ───────────────────────────────────────────────────────────────────
/**
 * Retrieves and deserialises a cached value.
 * Returns `null` on cache miss, JSON parse error, or any Redis error.
 * A null return tells the caller to fall back to PostgreSQL.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedisClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw, dateReviver) as T;  // dateReviver restores Date objects
  } catch (err) {
    // Log but never throw — Redis errors must not break the request path
    console.warn(`[cache] GET miss/error for key "${key}":`, (err as Error).message);
    return null;
  }
}

// ─── set<T> ───────────────────────────────────────────────────────────────────
/**
 * Serialises and stores a value with a TTL (seconds).
 * Silently swallows errors — a failed cache write is not a request failure.
 */
export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[cache] SET error for key "${key}":`, (err as Error).message);
  }
}

// ─── del ──────────────────────────────────────────────────────────────────────
/**
 * Deletes one or more cache keys atomically.
 * Silently swallows errors.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await getRedisClient().del(...keys);
  } catch (err) {
    console.warn(`[cache] DEL error for keys [${keys.join(', ')}]:`, (err as Error).message);
  }
}

// ─── withCache<T> ─────────────────────────────────────────────────────────────
/**
 * Convenience wrapper implementing the cache-aside pattern:
 *
 *   1. Try cache GET
 *   2. On hit: return immediately
 *   3. On miss: call `fetcher()` (PostgreSQL), write result to cache, return it
 *
 * Usage:
 *   const habits = await withCache(
 *     CacheKey.dashboard(userId, false),
 *     TTL.DASHBOARD,
 *     () => prisma.habit.findMany({ ... }),
 *   );
 */
export async function withCache<T>(
  key:        string,
  ttlSeconds: number,
  fetcher:    () => Promise<T>,
): Promise<T> {
  // 1. Try cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // 2. Cache miss — fetch from DB
  const data = await fetcher();

  // 3. Write through (async, no await — never delays response)
  void cacheSet(key, data, ttlSeconds);

  return data;
}
