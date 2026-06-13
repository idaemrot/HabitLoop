// ─── Worker Process Entry Point ───────────────────────────────────────────────
//
// This is the dedicated entrypoint for the standalone worker container.
// It connects to Postgres + Redis, starts all BullMQ workers, and idles.
// No HTTP server is created — this process is purely job-processing.
//
// Usage: node dist/worker.js
// ─────────────────────────────────────────────────────────────────────────────

import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis }       from './config/redis';
import { startWorkers, stopWorkers }           from './jobs';

async function bootstrapWorker(): Promise<void> {
  console.info('🔧 HabitLoop Worker starting…');

  await connectDatabase();
  await connectRedis();

  startWorkers();

  console.info('✅ Worker process running — awaiting jobs from Redis queues');

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.info(`\n⚡ ${signal} received — shutting down worker gracefully…`);
    await stopWorkers();
    await disconnectDatabase();
    await disconnectRedis();
    console.info('👋 Worker stopped cleanly');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection in Worker:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception in Worker:', err);
    process.exit(1);
  });
}

void bootstrapWorker();
