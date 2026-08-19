import { describe, it, expect, vi } from 'vitest';

// A minimal fake ioredis ChainableCommander: each command method returns
// `this` for chaining, and exec() resolves/rejects however the test wants.
function makeFakePipeline(exec: () => Promise<unknown>): {
  zincrby: ReturnType<typeof vi.fn>;
  expire:  ReturnType<typeof vi.fn>;
  zadd:    ReturnType<typeof vi.fn>;
  exec:    ReturnType<typeof vi.fn>;
} {
  const pipeline = {
    zincrby: vi.fn(),
    expire:  vi.fn(),
    zadd:    vi.fn(),
    exec:    vi.fn(exec),
  };
  pipeline.zincrby.mockReturnValue(pipeline);
  pipeline.expire.mockReturnValue(pipeline);
  pipeline.zadd.mockReturnValue(pipeline);
  return pipeline;
}

let fakePipeline: ReturnType<typeof makeFakePipeline>;

vi.mock('../config/redis', () => ({
  getRedisClient: (): { pipeline: () => typeof fakePipeline } => ({
    pipeline: () => fakePipeline,
  }),
}));

const { applyCheckInScore, undoCheckInScore } = await import('./leaderboardService');

describe('applyCheckInScore — Redis failures must propagate (bug #4)', () => {
  it('throws when the pipeline connection itself fails', async () => {
    fakePipeline = makeFakePipeline(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(applyCheckInScore('user-1', 5, 4)).rejects.toThrow('ECONNREFUSED');
  });

  it('throws when an individual pipelined command errors, even though exec() resolves', async () => {
    // ioredis resolves exec() with [err, result] tuples per command even when
    // one command fails — only a connection-level failure rejects exec().
    fakePipeline = makeFakePipeline(() =>
      Promise.resolve([
        [new Error('WRONGTYPE alltime'), null],
        [null, 5],
        [null, 'OK'],
        [null, 3],
        [null, 'OK'],
      ]),
    );

    await expect(applyCheckInScore('user-1', 5, 4)).rejects.toThrow('WRONGTYPE alltime');
  });

  it('resolves with the delta on a clean pipeline', async () => {
    fakePipeline = makeFakePipeline(() =>
      Promise.resolve([
        [null, 10], [null, 10], [null, 'OK'], [null, 10], [null, 'OK'],
      ]),
    );

    await expect(applyCheckInScore('user-1', 5, 4)).resolves.toBe(10);
  });
});

describe('undoCheckInScore — Redis failures must propagate (bug #4)', () => {
  it('throws when the pipeline connection itself fails', async () => {
    fakePipeline = makeFakePipeline(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(undoCheckInScore('user-1', 5, 4)).rejects.toThrow('ECONNREFUSED');
  });

  it('throws when an individual pipelined command errors, even though exec() resolves', async () => {
    fakePipeline = makeFakePipeline(() =>
      Promise.resolve([
        [new Error('WRONGTYPE alltime'), null],
        [null, -10],
        [null, -10],
      ]),
    );

    await expect(undoCheckInScore('user-1', 5, 4)).rejects.toThrow('WRONGTYPE alltime');
  });
});
