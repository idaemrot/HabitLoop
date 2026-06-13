import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env';

// ─── Socket.IO Server ─────────────────────────────────────────────────────────
let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Connection Handler ──────────────────────────────────────────────────
  io.on('connection', (socket) => {
    console.info(`🔌 Socket connected: ${socket.id}`);

    // TODO: Register event handlers here
    // socket.on('habit:check-in', handleHabitCheckIn);
    // socket.on('streak:update',  handleStreakUpdate);

    socket.on('disconnect', (reason) => {
      console.info(`🔌 Socket disconnected: ${socket.id} — ${reason}`);
    });
  });

  console.info('✅ Socket.IO initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO has not been initialized. Call initializeSocket() first.');
  return io;
}
