import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { LeaderboardJobData, LeaderboardJobResult } from '../types';

const applyCheckInScore    = vi.fn();
const undoCheckInScore     = vi.fn();
const syncLeaderboardFromDB = vi.fn();

vi.mock('../../services/leaderboardService', () => ({
  applyCheckInScore:     (...args: unknown[]): unknown => applyCheckInScore(...args),
  undoCheckInScore:      (...args: unknown[]): unknown => undoCheckInScore(...args),
  syncLeaderboardFromDB: (...args: unknown[]): unknown => syncLeaderboardFromDB(...args),
}));

const setnx  = vi.fn();
const expire = vi.fn().mockResolvedValue(1);

vi.mock('../../config/redis', () => ({
  getRedisClient: (): { setnx: typeof setnx; expire: typeof expire } => ({ setnx, expire }),
}));

const { processLeaderboardJob } = await import('./leaderboardWorker');

function fakeJob(
  id: string,
  data: LeaderboardJobData,
): Job<LeaderboardJobData, LeaderboardJobResult> {
  return { id, data } as Job<LeaderboardJobData, LeaderboardJobResult>;
}

describe('leaderboardWorker — Redis failures must fail the job (bug #4)', () => {
  beforeEach(() => {
    applyCheckInScore.mockReset();
    undoCheckInScore.mockReset();
    setnx.mockReset().mockResolvedValue(1); // lock acquired by default
    expire.mockClear();
  });

  it('ADD_SCORE: rejects the job when applyCheckInScore throws (Redis outage)', async () => {
    applyCheckInScore.mockRejectedValue(new Error('ECONNREFUSED'));

    const job = fakeJob('checkin-1', {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });

    // This is the actual regression: before the fix, applyCheckInScore
    // swallowed the error and returned 0, so this call would have RESOLVED
    // with { delta: 0 } instead of rejecting — BullMQ would have marked the
    // job "completed" and never retried it.
    await expect(processLeaderboardJob(job)).rejects.toThrow('ECONNREFUSED');
  });

  it('REMOVE_SCORE: rejects the job when undoCheckInScore throws (Redis outage)', async () => {
    undoCheckInScore.mockRejectedValue(new Error('ECONNREFUSED'));

    const job = fakeJob('undo-1', {
      type: 'REMOVE_SCORE', userId: 'user-1', streakBeforeUndo: 5, streakAfterUndo: 4,
    });

    await expect(processLeaderboardJob(job)).rejects.toThrow('ECONNREFUSED');
  });

  it('ADD_SCORE: still resolves normally when Redis is healthy', async () => {
    applyCheckInScore.mockResolvedValue(10);

    const job = fakeJob('checkin-2', {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });

    await expect(processLeaderboardJob(job)).resolves.toEqual({
      userId: 'user-1', delta: 10, operation: 'ADD_SCORE',
    });
  });
});
