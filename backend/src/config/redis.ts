import Redis from 'ioredis';
import { env } from './env';

// ─── Redis Client Singleton ──────────────────────────────────────────────────
// Supports local redis:// and Upstash redis:// / rediss:// URLs.
//
// enableReadyCheck: false — Upstash blocks the INFO command ioredis sends
//   during the ready-check phase, causing an immediate connect→close→error.
//   BullMQ also recommends disabling this.
//
// TLS: enabled when URL uses rediss:// scheme (Upstash TLS port 6380).
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const isTLS = env.REDIS_URL.startsWith('rediss://');

    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,  // Required by BullMQ
      enableReadyCheck:     false, // Upstash blocks INFO — must be false
      lazyConnect:          true,
      ...(isTLS && { tls: {} }),   // Enable TLS for rediss:// URLs
    });

    redisClient.on('connect', () => console.info('✅ Redis connected'));
    redisClient.on('ready',   () => console.info('✅ Redis ready'));
    redisClient.on('error',   (err) => console.error('❌ Redis error:', err.message));
    redisClient.on('close',   () => console.warn('⚠️  Redis connection closed'));
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  // Guard: catch misconfigured REDIS_URL in production
  if (env.NODE_ENV === 'production' && env.REDIS_URL === 'redis://localhost:6379') {
    throw new Error(
      '❌ REDIS_URL is localhost in production — set it to your Upstash URL in the Render dashboard.',
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

