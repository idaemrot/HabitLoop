import Redis from 'ioredis';
import { env } from './env';

// ─── Redis Client Singleton ──────────────────────────────────────────────────
// Supports both local redis:// and Upstash rediss:// (TLS) URLs.
// enableReadyCheck is disabled for TLS (Upstash) connections — Upstash does not
// support the INFO command ioredis sends during the ready-check phase, which
// causes an immediate connect → close → error cycle.
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const isTLS = env.REDIS_URL.startsWith('rediss://');

    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,          // Required by BullMQ
      enableReadyCheck: !isTLS,            // Disable for Upstash (TLS) — it doesn't support INFO
      lazyConnect: true,
      ...(isTLS && { tls: {} }),           // Required for Upstash TLS connections
    });

    redisClient.on('connect', () => console.info('✅ Redis connected'));
    redisClient.on('ready',   () => console.info('✅ Redis ready'));
    redisClient.on('error',   (err) => console.error('❌ Redis error:', err.message));
    redisClient.on('close',   () => console.warn('⚠️  Redis connection closed'));
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  // Guard: catch misconfigured REDIS_URL early in production
  if (env.NODE_ENV === 'production' && env.REDIS_URL === 'redis://localhost:6379') {
    throw new Error(
      '❌ REDIS_URL is set to localhost in production. ' +
      'Set REDIS_URL to your Upstash rediss:// URL in the Render dashboard.',
    );
  }

  const client = getRedisClient();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.info('🔌 Redis disconnected');
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

