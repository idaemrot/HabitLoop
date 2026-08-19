import { describe, it, expect, vi, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';

// ─── Real Lua execution, no live Redis needed ─────────────────────────────────
// ioredis-mock bundles a genuine Lua VM (fengari) and implements EVAL, so
// these tests exercise the ACTUAL Lua script text from leaderboardService.ts
// — not a hand-rolled reimplementation of what it's supposed to do. This is
// the strongest verification available in this environment (no Redis server
// or Docker daemon reachable here); it does not replace running these
// scripts against a real Redis at least once before deploying.
let redis: InstanceType<typeof RedisMock>;

vi.mock('../config/redis', () => ({
  getRedisClient: (): InstanceType<typeof RedisMock> => redis,
}));

const {
  applyCheckInScoreIdempotent,
  undoCheckInScoreIdempotent,
} = await import('./leaderboardService');

describe('applyCheckInScoreIdempotent — atomic claim+mutate (bug #5)', () => {
  beforeEach(async () => {
    // ioredis-mock instances share one in-memory "server" by default (like
    // real ioredis clients pointed at the same host:port), so a fresh
    // `new RedisMock()` per test is NOT enough isolation on its own —
    // flush explicitly so no key leaks between tests.
    redis = new RedisMock();
    await redis.flushall();
  });

  it('applies the score on the first call for a given jobId', async () => {
    const delta = await applyCheckInScoreIdempotent('job-1', 'user-1', 5, 4);
    expect(delta).toBe(10); // BASE_SCORE only, no milestone crossed

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(10);
  });

  // This is the actual bug #5 regression: with the old SETNX-then-mutate
  // sequence, a retry of the SAME job after a crash between the two steps
  // either replayed the mutation (double count) or, if the crash happened
  // before the mutation, permanently skipped it (loss). Here the claim and
  // the mutation are one atomic script, so a retry with the same jobId is
  // provably a no-op — the score is incremented exactly once, ever.
  it('a retry with the SAME jobId does not double-apply the score', async () => {
    const first  = await applyCheckInScoreIdempotent('job-1', 'user-1', 5, 4);
    const second = await applyCheckInScoreIdempotent('job-1', 'user-1', 5, 4); // simulated BullMQ retry

    expect(first).toBe(10);
    expect(second).toBe(0); // signals "already applied" — caller must not treat as new points

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(10); // NOT 20 — incremented once, not twice
  });

  it('a DIFFERENT jobId for the same user is a distinct, additive event', async () => {
    await applyCheckInScoreIdempotent('job-1', 'user-1', 5, 4);
    await applyCheckInScoreIdempotent('job-2', 'user-1', 6, 5); // next day's check-in

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(20);
  });

  it('awards the +50 milestone bonus once when crossing the 7-day streak', async () => {
    const delta = await applyCheckInScoreIdempotent('job-7', 'user-1', 7, 6);
    expect(delta).toBe(60); // 10 base + 50 milestone

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(60);
  });

  it('propagates a Redis failure without silently applying or claiming', async () => {
    // Simulate a connection-level failure: EVAL rejects.
    vi.spyOn(redis, 'eval').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(applyCheckInScoreIdempotent('job-x', 'user-1', 5, 4)).rejects.toThrow('ECONNREFUSED');

    // Nothing was claimed or applied — a real retry starts clean.
    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(score).toBeNull();
    const retryDelta = await applyCheckInScoreIdempotent('job-x', 'user-1', 5, 4);
    expect(retryDelta).toBe(10);
  });
});

describe('undoCheckInScoreIdempotent — atomic claim+mutate (bug #5)', () => {
  beforeEach(async () => {
    // ioredis-mock instances share one in-memory "server" by default (like
    // real ioredis clients pointed at the same host:port), so a fresh
    // `new RedisMock()` per test is NOT enough isolation on its own —
    // flush explicitly so no key leaks between tests.
    redis = new RedisMock();
    await redis.flushall();
  });

  it('deducts the score on the first call for a given jobId', async () => {
    await redis.zadd('leaderboard:alltime', 10, 'user-1');

    const delta = await undoCheckInScoreIdempotent('undo-1', 'user-1', 5, 4);
    expect(delta).toBe(10);

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(0);
  });

  it('a retry with the SAME jobId does not double-deduct the score', async () => {
    await redis.zadd('leaderboard:alltime', 20, 'user-1');

    const first  = await undoCheckInScoreIdempotent('undo-1', 'user-1', 5, 4);
    const second = await undoCheckInScoreIdempotent('undo-1', 'user-1', 5, 4); // simulated retry

    expect(first).toBe(10);
    expect(second).toBe(0);

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(10); // deducted once, not twice
  });

  it('clamps the score to 0 instead of going negative', async () => {
    await redis.zadd('leaderboard:alltime', 5, 'user-1'); // less than the 10-point deduction

    await undoCheckInScoreIdempotent('undo-2', 'user-1', 5, 4);

    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(0);
  });

  it('propagates a Redis failure without silently applying or claiming', async () => {
    await redis.zadd('leaderboard:alltime', 10, 'user-1');
    vi.spyOn(redis, 'eval').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(undoCheckInScoreIdempotent('undo-x', 'user-1', 5, 4)).rejects.toThrow('ECONNREFUSED');

    // Score untouched — a real retry starts clean.
    const score = await redis.zscore('leaderboard:alltime', 'user-1');
    expect(Number(score)).toBe(10);
  });
});
