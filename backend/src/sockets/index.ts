import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer }  from 'socket.io';
import { env }                       from '../config/env';
import { socketAuthMiddleware }      from './socketAuth';
import { setupConnectionManager }    from './connectionManager';

// ─── Socket.IO Server singleton ───────────────────────────────────────────────
let io: SocketIOServer | null = null;

// ─── initializeSocket ─────────────────────────────────────────────────────────
//
// Architecture:
//
//   HTTP Server
//       │
//       └── Socket.IO Server
//               │
//               ├── Middleware: socketAuthMiddleware
//               │     Reads Bearer token from socket.handshake.auth.token
//               │     Attaches userId + username to socket.data
//               │     Rejects unauthenticated connections
//               │
//               └── Connection handler (setupConnectionManager)
//                     Joins socket to personal room: user:{userId}
//                     Tracks online presence (userId → socket count)
//                     Handles disconnect + reference counting
//
// Event flow:
//
//   User checks in (POST /api/habits/:id/checkin)
//       │
//       └── checkInService.emitCheckInEvent(io, ...)
//               │
//               ├── Fetches friend IDs for this user (Friendship query)
//               ├── For each friend → emit to room user:{friendId}
//               │     Event: 'friend:checked-in'
//               └── Emit 'habit:streak-updated' to own room (dashboard refresh)
// ─────────────────────────────────────────────────────────────────────────────
export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:      env.CORS_ORIGIN,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    transports:          ['websocket', 'polling'],
    // Ping/pong keep-alive — drop stale connections after 30s of silence
    pingTimeout:         30_000,
    pingInterval:        25_000,
    // Reject payloads > 100kb to guard against amplification attacks
    maxHttpBufferSize:   100 * 1024,
  });

  // ── Auth middleware — runs before 'connection' event ──────────────────────
  io.use(socketAuthMiddleware);

  // ── Connection + room management ──────────────────────────────────────────
  setupConnectionManager(io);

  console.info('✅ Socket.IO initialized');
  return io;
}

// ─── getIO ────────────────────────────────────────────────────────────────────
// Used by services that need to emit events (e.g. checkInService).
// Throws if called before initializeSocket — prevents silent no-ops.
export function getIO(): SocketIOServer {
  if (!io) throw new Error('[Socket] getIO() called before initializeSocket()');
  return io;
}
