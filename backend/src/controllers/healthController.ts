import type { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';

// ─── Health Check Controller ──────────────────────────────────────────────────
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const timestamp = new Date().toISOString();

  const [dbOk, redisOk] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);

  const allHealthy = dbOk && redisOk;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp,
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      database: dbOk ? 'connected' : 'disconnected',
      redis: redisOk ? 'connected' : 'disconnected',
    },
    uptime: Math.floor(process.uptime()),
  });
}
