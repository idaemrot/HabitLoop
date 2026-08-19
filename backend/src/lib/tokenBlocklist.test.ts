import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blocklistAccessToken, isAccessTokenBlocklisted } from './tokenBlocklist';

const set = vi.fn();
const get = vi.fn();

vi.mock('../config/redis', () => ({
  getRedisClient: (): { set: typeof set; get: typeof get } => ({ set, get }),
}));

describe('tokenBlocklist', () => {
  beforeEach(() => {
    set.mockReset();
    get.mockReset();
    vi.useRealTimers();
  });

  describe('blocklistAccessToken', () => {
    it('stores the jti with a TTL matching the token\'s remaining lifetime', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      await blocklistAccessToken('jti-123', nowSeconds + 900); // 15 min left

      expect(set).toHaveBeenCalledTimes(1);
      const [key, value, mode, ttl] = set.mock.calls[0] as [string, string, string, number];
      expect(key).toBe('auth:blocklist:jti:jti-123');
      expect(value).toBe('1');
      expect(mode).toBe('EX');
      // Allow a couple seconds of test-execution slack either side of 900.
      expect(ttl).toBeGreaterThan(895);
      expect(ttl).toBeLessThanOrEqual(900);
    });

    it('does nothing for a token that has already expired', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      await blocklistAccessToken('jti-expired', nowSeconds - 10);
      expect(set).not.toHaveBeenCalled();
    });

    it('never throws if Redis is unreachable (logout must still succeed)', async () => {
      set.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const nowSeconds = Math.floor(Date.now() / 1000);
      await expect(blocklistAccessToken('jti-x', nowSeconds + 60)).resolves.toBeUndefined();
    });
  });

  describe('isAccessTokenBlocklisted', () => {
    it('returns true when the jti key exists', async () => {
      get.mockResolvedValueOnce('1');
      await expect(isAccessTokenBlocklisted('jti-123')).resolves.toBe(true);
      expect(get).toHaveBeenCalledWith('auth:blocklist:jti:jti-123');
    });

    it('returns false when the jti was never blocklisted', async () => {
      get.mockResolvedValueOnce(null);
      await expect(isAccessTokenBlocklisted('jti-999')).resolves.toBe(false);
    });

    it('fails OPEN (returns false) if Redis is unreachable', async () => {
      get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(isAccessTokenBlocklisted('jti-x')).resolves.toBe(false);
    });
  });
});
