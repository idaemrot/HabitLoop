import http from 'http';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { initializeSocket } from './sockets';
import { startWorkers } from './jobs';
import { createApp } from './app';

async function bootstrap(): Promise<void> {
  // ── Connect to services ────────────────────────────────────────────────────
  await connectDatabase();
  await connectRedis();

  // ── Build HTTP server ──────────────────────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ── Initialize Socket.IO ───────────────────────────────────────────────────
  initializeSocket(httpServer);

  // ── Start BullMQ Workers ───────────────────────────────────────────────────
  startWorkers();

  // ── Start listening ────────────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    console.info(`🚀 HabitLoop API running on http://localhost:${env.PORT}`);
    console.info(`📋 Health check: http://localhost:${env.PORT}/api/health`);
    console.info(`🌍 Environment: ${env.NODE_ENV}`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string): Promise<void> => {
    console.info(`\n⚡ ${signal} received — shutting down gracefully...`);

    httpServer.close(async () => {
      await disconnectDatabase();
      await disconnectRedis();
      console.info('👋 Goodbye!');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  // ── Unhandled Errors ───────────────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
}

void bootstrap();
