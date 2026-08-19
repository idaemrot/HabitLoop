import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';
import type { LeaderboardJobData, LeaderboardJobResult } from '../types';

const applyCheckInScore            = vi.fn();
const undoCheckInScore             = vi.fn();
const applyCheckInScoreIdempotent  = vi.fn();
const undoCheckInScoreIdempotent   = vi.fn();
const syncLeaderboardFromDB        = vi.fn();

vi.mock('../../services/leaderboardService', () => ({
  applyCheckInScore:           (...args: unknown[]): unknown => applyCheckInScore(...args),
  undoCheckInScore:            (...args: unknown[]): unknown => undoCheckInScore(...args),
  applyCheckInScoreIdempotent: (...args: unknown[]): unknown => applyCheckInScoreIdempotent(...args),
  undoCheckInScoreIdempotent:  (...args: unknown[]): unknown => undoCheckInScoreIdempotent(...args),
  syncLeaderboardFromDB:       (...args: unknown[]): unknown => syncLeaderboardFromDB(...args),
}));

const { processLeaderboardJob } = await import('./leaderboardWorker');

function fakeJob(
  id: string | undefined,
  data: LeaderboardJobData,
): Job<LeaderboardJobData, LeaderboardJobResult> {
  return { id, data } as Job<LeaderboardJobData, LeaderboardJobResult>;
}

describe('leaderboardWorker — Redis failures must fail the job (bug #4)', () => {
  beforeEach(() => {
    applyCheckInScore.mockReset();
    undoCheckInScore.mockReset();
    applyCheckInScoreIdempotent.mockReset();
    undoCheckInScoreIdempotent.mockReset();
  });

  it('ADD_SCORE: rejects the job when applyCheckInScoreIdempotent throws (Redis outage)', async () => {
    applyCheckInScoreIdempotent.mockRejectedValue(new Error('ECONNREFUSED'));

    const job = fakeJob('checkin-1', {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });

    // This is the bug #4 regression: before that fix, the underlying score
    // function swallowed the error and returned 0, so this call would have
    // RESOLVED with { delta: 0 } instead of rejecting — BullMQ would have
    // marked the job "completed" and never retried it.
    await expect(processLeaderboardJob(job)).rejects.toThrow('ECONNREFUSED');
  });

  it('REMOVE_SCORE: rejects the job when undoCheckInScoreIdempotent throws (Redis outage)', async () => {
    undoCheckInScoreIdempotent.mockRejectedValue(new Error('ECONNREFUSED'));

    const job = fakeJob('undo-1', {
      type: 'REMOVE_SCORE', userId: 'user-1', streakBeforeUndo: 5, streakAfterUndo: 4,
    });

    await expect(processLeaderboardJob(job)).rejects.toThrow('ECONNREFUSED');
  });

  it('ADD_SCORE: still resolves normally when Redis is healthy', async () => {
    applyCheckInScoreIdempotent.mockResolvedValue(10);

    const job = fakeJob('checkin-2', {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });

    await expect(processLeaderboardJob(job)).resolves.toEqual({
      userId: 'user-1', delta: 10, operation: 'ADD_SCORE',
    });
  });
});

describe('leaderboardWorker — routes to the atomic idempotent path (bug #5)', () => {
  beforeEach(() => {
    applyCheckInScore.mockReset();
    undoCheckInScore.mockReset();
    applyCheckInScoreIdempotent.mockReset();
    undoCheckInScoreIdempotent.mockReset();
  });

  it('ADD_SCORE: uses applyCheckInScoreIdempotent (not the plain function) when job.id is set', async () => {
    applyCheckInScoreIdempotent.mockResolvedValue(10);

    const job = fakeJob('checkin-3', {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });
    await processLeaderboardJob(job);

    expect(applyCheckInScoreIdempotent).toHaveBeenCalledWith('checkin-3', 'user-1', 5, 4);
    expect(applyCheckInScore).not.toHaveBeenCalled();
  });

  it('REMOVE_SCORE: uses undoCheckInScoreIdempotent (not the plain function) when job.id is set', async () => {
    undoCheckInScoreIdempotent.mockResolvedValue(10);

    const job = fakeJob('undo-3', {
      type: 'REMOVE_SCORE', userId: 'user-1', streakBeforeUndo: 5, streakAfterUndo: 4,
    });
    await processLeaderboardJob(job);

    expect(undoCheckInScoreIdempotent).toHaveBeenCalledWith('undo-3', 'user-1', 5, 4);
    expect(undoCheckInScore).not.toHaveBeenCalled();
  });

  it('ADD_SCORE: falls back to the plain (non-idempotent) function if job.id is missing', async () => {
    applyCheckInScore.mockResolvedValue(10);

    const job = fakeJob(undefined, {
      type: 'ADD_SCORE', userId: 'user-1', prevStreak: 4, currentStreak: 5,
    });
    await processLeaderboardJob(job);

    expect(applyCheckInScore).toHaveBeenCalledWith('user-1', 5, 4);
    expect(applyCheckInScoreIdempotent).not.toHaveBeenCalled();
  });
});
