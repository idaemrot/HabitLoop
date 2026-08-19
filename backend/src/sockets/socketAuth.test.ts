import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { signAccessToken, verifyAccessToken } from '../lib/jwt';
import { env } from '../config/env';

// ─── Mocks ─────────────────────────────────────────────────────────────────
// Mocks the Redis client itself (same pattern as tokenBlocklist.test.ts),
// NOT isAccessTokenBlocklisted directly. This means every test below drives
// socketAuthMiddleware through the REAL isAccessTokenBlocklisted — the
// strongest available proof that the Socket.IO auth path enforces
// revocation exactly like the already-tested HTTP path (middlewares/auth.ts),
// and that the correct jti reaches the correct Redis key, not just that
// *some* boolean got returned.
const get = vi.fn();

vi.mock('../config/redis', () => ({
  getRedisClient: (): { get: typeof get } => ({ get }),
}));

const { socketAuthMiddleware } = await import('./socketAuth');

function makeSocket(token?: string): Socket {
  return {
    handshake: { auth: token ? { token } : {} },
    data: {},
  } as unknown as Socket;
}

describe('socketAuthMiddleware', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('accepts a valid, non-blocklisted token and attaches identity to socket.data', async () => {
    get.mockResolvedValue(null); // real Redis semantics: key does not exist
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });
    const { jti } = verifyAccessToken(token);
    const socket = makeSocket(token);
    const next  = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(socket.data.userId).toBe('user-1');
    expect(socket.data.username).toBe('manish');
    // Proves the EXACT jti (not sub, not some other field) is what gets
    // looked up — via the real Redis key template in tokenBlocklist.ts.
    expect(get).toHaveBeenCalledWith(`auth:blocklist:jti:${jti}`);
  });

  // Regression test for bug #1's Socket.IO path: before the fix, a
  // structurally valid, unexpired, correctly-signed token was accepted
  // regardless of logout — the socket handshake had no revocation check
  // at all. This proves it now does.
  it('rejects a structurally valid, unexpired token whose jti has been revoked (post-logout)', async () => {
    get.mockResolvedValue('1'); // real Redis semantics: key exists
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });
    const { jti } = verifyAccessToken(token);
    const socket = makeSocket(token);
    const next  = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(socket.data.userId).toBeUndefined();
    expect(socket.data.username).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(Error);
    expect(get).toHaveBeenCalledWith(`auth:blocklist:jti:${jti}`);
  });

  it('rejects a malformed token without ever checking the blocklist', async () => {
    const socket = makeSocket('not-a-real-jwt');
    const next   = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(socket.data.userId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(Error);
    // JWT verification fails first — the blocklist is never consulted.
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects an expired token without ever checking the blocklist', async () => {
    // Signed the same way lib/jwt.ts does (same secret, same algorithm),
    // but with a negative expiresIn so `exp` is already in the past.
    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'a@b.com', username: 'manish', jti: 'expired-jti' },
      env.JWT_SECRET,
      { expiresIn: '-10s', algorithm: 'HS256' },
    );
    const socket = makeSocket(expiredToken);
    const next   = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(socket.data.userId).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBeInstanceOf(Error);
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects when no token is provided, using the existing "no token" error', async () => {
    const socket = makeSocket(); // no auth.token at all
    const next   = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Authentication required: no token provided');
    expect(get).not.toHaveBeenCalled();
  });

  // Preserves the documented fail-open policy (see tokenBlocklist.ts): a
  // Redis outage must not lock out otherwise-valid sessions. The actual
  // Redis-error → false conversion is unit-proven in isolation in
  // tokenBlocklist.test.ts; this test proves socketAuthMiddleware correctly
  // trusts that resolution end-to-end (via the REAL isAccessTokenBlocklisted,
  // not a stand-in) rather than adding its own defensive "reject on
  // uncertainty" behavior that would silently change the security policy.
  it('fails OPEN when the blocklist read fails — a Redis outage does not lock out a valid session', async () => {
    get.mockRejectedValue(new Error('ECONNREFUSED'));
    const token = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });
    const socket = makeSocket(token);
    const next   = vi.fn();

    await socketAuthMiddleware(socket, next as unknown as (err?: Error) => void);

    expect(next).toHaveBeenCalledWith(); // no error — connection allowed
    expect(socket.data.userId).toBe('user-1');
    expect(socket.data.username).toBe('manish');
  });
});
