import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { signAccessToken } from '../lib/jwt';

const isAccessTokenBlocklisted = vi.fn();

vi.mock('../lib/tokenBlocklist', () => ({
  isAccessTokenBlocklisted: (jti: string): Promise<boolean> => isAccessTokenBlocklisted(jti),
}));

// Imported AFTER the mock is declared so `authenticate` picks up the mocked module.
const { authenticate } = await import('./auth');

function makeReq(token?: string): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as Request;
}

describe('authenticate', () => {
  beforeEach(() => {
    isAccessTokenBlocklisted.mockReset();
  });

  it('rejects requests with no Authorization header', async () => {
    const next = vi.fn() as unknown as NextFunction;
    const req  = makeReq();

    await authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    expect(req.user).toBeUndefined();
  });

  it('accepts a valid, non-revoked access token', async () => {
    isAccessTokenBlocklisted.mockResolvedValue(false);
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });
    const next  = vi.fn() as unknown as NextFunction;
    const req   = makeReq(token);

    await authenticate(req, {} as Response, next);

    expect(req.user?.sub).toBe('user-1');
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  // Regression test for bug #1: logging out previously had no effect on an
  // already-issued, still-unexpired access token — it stayed valid for the
  // rest of its 15-minute lifetime. This proves a blocklisted jti is now
  // rejected even though the token's signature and expiry are both fine.
  it('rejects a structurally-valid, unexpired token whose jti has been revoked (post-logout)', async () => {
    isAccessTokenBlocklisted.mockResolvedValue(true);
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });
    const next  = vi.fn() as unknown as NextFunction;
    const req   = makeReq(token);

    await authenticate(req, {} as Response, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ statusCode: 401 });
  });

  it('rejects a garbage token', async () => {
    const next = vi.fn() as unknown as NextFunction;
    const req  = makeReq('not-a-real-jwt');

    await authenticate(req, {} as Response, next);

    expect(req.user).toBeUndefined();
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({ statusCode: 401 });
    // A malformed token never reaches the blocklist check.
    expect(isAccessTokenBlocklisted).not.toHaveBeenCalled();
  });
});
