import { PrismaClient } from '@prisma/client';
import { env } from './env';

// ─── Singleton Prisma Client ──────────────────────────────────────────────────
// Attached to `global` in development so TSX hot-reload doesn't exhaust the
// PostgreSQL connection pool (default max: 10).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
  });

// Log slow queries in development
if (env.NODE_ENV === 'development') {
  // @ts-expect-error — 'query' event is only typed when log config uses 'event' emit
  prisma.$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 200) {
      console.warn(`⚠️  Slow query (${e.duration}ms): ${e.query.slice(0, 120)}…`);
    }
  });
}

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// ─── Lifecycle helpers ────────────────────────────────────────────────────────
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  console.info('✅ Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.info('🔌 Database disconnected');
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
