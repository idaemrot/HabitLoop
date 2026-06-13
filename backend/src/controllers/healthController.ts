import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { checkRedisHealth } from '../config/redis';

// ─── Health Check Controller ──────────────────────────────────────────────────
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const timestamp = new Date().toISOString();

  // Check database connectivity
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  // Check Redis connectivity
  const redisOk = await checkRedisHealth();
  const redisStatus: 'connected' | 'disconnected' = redisOk ? 'connected' : 'disconnected';

  const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp,
    version: process.env.npm_package_version ?? '1.0.0',
    environment: process.env.NODE_ENV,
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
    uptime: process.uptime(),
  });
}
