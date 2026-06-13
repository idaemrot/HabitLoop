import type { Server as SocketIOServer, Socket } from 'socket.io';

// ─── Room System Design ───────────────────────────────────────────────────────
//
// Each authenticated user gets a personal room keyed by their userId:
//
//   Room name: `user:<userId>`
//
// When a friend completes a habit, the server emits the event to all rooms
// belonging to that user's friends. The emitter does NOT need to know which
// specific sockets are online — Socket.IO's room abstraction handles fanout.
//
// Why personal rooms instead of a shared friends room?
//   - Each user has a different friend list; there is no single "friends room"
//   - Personal rooms survive multi-server deployments (with Redis adapter)
//   - Adding a user to a room is idempotent — reconnects are safe
//
// Online tracking:
//   A user is "online" if they have ≥ 1 active socket in their personal room.
//   We track a userSocketCount map (userId → number of sockets) so we know
//   when a user goes fully offline (count reaches 0).
// ─────────────────────────────────────────────────────────────────────────────

// In-memory online user map: userId → count of active sockets
// Note: this is per-process. For multi-server, replace with Redis.
const onlineUsers = new Map<string, number>();

// ─── Room names ───────────────────────────────────────────────────────────────
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

// ─── Connection Manager ───────────────────────────────────────────────────────
export function setupConnectionManager(io: SocketIOServer): void {
  // This runs for every authenticated socket connection
  io.on('connection', (socket: Socket) => {
    const userId   = socket.data.userId   as string;
    const username = socket.data.username as string;

    // 1. Join personal room
    void socket.join(userRoom(userId));

    // 2. Update online count
    const prev = onlineUsers.get(userId) ?? 0;
    onlineUsers.set(userId, prev + 1);

    console.info(`🔌 [Socket] ${username} (${userId}) connected — socket ${socket.id} — online sockets: ${prev + 1}`);

    // 3. Handle disconnect
    socket.on('disconnect', (reason: string) => {
      const current = onlineUsers.get(userId) ?? 1;
      const remaining = current - 1;

      if (remaining <= 0) {
        onlineUsers.delete(userId);
        console.info(`🔌 [Socket] ${username} (${userId}) went offline — reason: ${reason}`);
      } else {
        onlineUsers.set(userId, remaining);
        console.info(`🔌 [Socket] ${username} socket ${socket.id} disconnected — ${remaining} sockets remaining`);
      }
    });
  });
}

// ─── Online status helpers ────────────────────────────────────────────────────

/** Returns true if the user has at least one active socket connection */
export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId) ?? 0) > 0;
}

/** Returns the full set of currently online user IDs */
export function getOnlineUserIds(): string[] {
  return [...onlineUsers.keys()];
}

/** Returns the count of online sockets for a given user */
export function getOnlineSocketCount(userId: string): number {
  return onlineUsers.get(userId) ?? 0;
}
