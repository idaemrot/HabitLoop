import Redis from 'ioredis';
import { env } from './env';

// ─── Redis Client Singleton ──────────────────────────────────────────────────
// Supports both local redis:// and Upstash rediss:// (TLS) URLs.
// ioredis requires tls:{} to be set explicitly when using the rediss:// scheme.
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const isTLS = env.REDIS_URL.startsWith('rediss://');

    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      lazyConnect: true,
      ...(isTLS && { tls: {} }), // Required for Upstash TLS connections
    });

    redisClient.on('connect', () => console.info('✅ Redis connected'));
    redisClient.on('error', (err) => console.error('❌ Redis error:', err));
    redisClient.on('close', () => console.warn('⚠️  Redis connection closed'));
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
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
