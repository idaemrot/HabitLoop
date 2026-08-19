import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signAccessToken } from '../lib/jwt';

const deleteMany        = vi.fn().mockResolvedValue({ count: 1 });
const blocklistAccessToken = vi.fn().mockResolvedValue(undefined);

vi.mock('../config/database', () => ({
  prisma: { refreshToken: { deleteMany } },
}));

vi.mock('../lib/tokenBlocklist', () => ({
  blocklistAccessToken: (jti: string, exp: number): Promise<void> => blocklistAccessToken(jti, exp),
}));

const { logoutUser } = await import('./authService');

describe('logoutUser', () => {
  beforeEach(() => {
    deleteMany.mockClear();
    blocklistAccessToken.mockClear();
  });

  it('deletes the refresh token and blocklists the access token jti', async () => {
    const accessToken = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });

    await logoutUser('raw-refresh-token', accessToken);

    expect(deleteMany).toHaveBeenCalledWith({ where: { token: expect.any(String) } });
    expect(blocklistAccessToken).toHaveBeenCalledTimes(1);
    const [jti, exp] = blocklistAccessToken.mock.calls[0] as [string, number];
    expect(jti).toEqual(expect.any(String));
    expect(exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('still blocklists the access token when no refresh token/cookie is present', async () => {
    const accessToken = signAccessToken({ sub: 'user-1', email: 'a@b.com', username: 'manish' });

    await logoutUser(undefined, accessToken);

    expect(deleteMany).not.toHaveBeenCalled();
    expect(blocklistAccessToken).toHaveBeenCalledTimes(1);
  });

  it('does not throw for a malformed access token — refresh-token deletion still happens', async () => {
    await expect(logoutUser('raw-refresh-token', 'not-a-real-jwt')).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(blocklistAccessToken).not.toHaveBeenCalled();
  });

  it('is a no-op when neither token is provided', async () => {
    await expect(logoutUser(undefined, undefined)).resolves.toBeUndefined();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(blocklistAccessToken).not.toHaveBeenCalled();
  });
});
