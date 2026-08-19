import { getRedisClient } from '../config/redis';

// ─── Access Token Revocation (blocklist) ──────────────────────────────────────
//
// Access tokens are stateless JWTs (15m TTL) — logging out cannot invalidate
// one by itself. Every access token carries a unique `jti` (see lib/jwt.ts);
// on logout we record that jti in Redis for exactly as long as the token
// would otherwise remain valid. authenticate() / optionalAuthenticate() /
// socketAuthMiddleware() consult this before trusting an otherwise-valid,
// unexpired token.
//
// Failure mode: if Redis is unreachable, isAccessTokenBlocklisted() fails
// OPEN (returns false — token treated as not revoked) rather than rejecting
// every request. This matches how the rest of the app already treats Redis
// (see lib/cache.ts) — Redis is never a single point of failure for the API.
// The tradeoff: during a Redis outage, a token revoked just before the outage
// remains usable until its natural 15-minute expiry, same as before this fix.
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'auth:blocklist:jti:';

/**
 * Marks an access token's jti as revoked until `expiresAtEpochSeconds`
 * (the token's own `exp` claim) — after that the token would have expired
 * naturally anyway, so the key is left to expire at the same moment.
 */
export async function blocklistAccessToken(
  jti: string,
  expiresAtEpochSeconds: number,
): Promise<void> {
  const ttlSeconds = expiresAtEpochSeconds - Math.floor(Date.now() / 1000);
  if (ttlSeconds <= 0) return; // already expired — nothing to revoke

  try {
    await getRedisClient().set(`${PREFIX}${jti}`, '1', 'EX', ttlSeconds);
  } catch (err) {
    // Logout must still succeed even if Redis is down — log and move on.
    console.error('[auth] failed to blocklist access token:', (err as Error).message);
  }
}

/** Returns true only if this jti was explicitly revoked. Fails open on Redis errors. */
export async function isAccessTokenBlocklisted(jti: string): Promise<boolean> {
  try {
    const value = await getRedisClient().get(`${PREFIX}${jti}`);
    return value !== null;
  } catch (err) {
    console.error('[auth] blocklist check failed — failing open:', (err as Error).message);
    return false;
  }
}
