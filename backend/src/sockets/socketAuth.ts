import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { isAccessTokenBlocklisted } from '../lib/tokenBlocklist';

// ─── Socket.IO JWT Auth Middleware ───────────────────────────────────────────
//
// Reads the access token from socket.handshake.auth.token.
// The frontend sets this via: socket.auth = { token: accessToken }
//
// On success: attaches userId and username to socket.data
// On failure: calls next() with an Error — Socket.IO rejects the connection
//
// WHY NOT cookies?
//   Socket.IO handshakes support cookies via withCredentials but the access
//   token lives in memory (per spec — never in localStorage or cookies).
//   The client must pass it explicitly in the auth object.
// ─────────────────────────────────────────────────────────────────────────────
export async function socketAuthMiddleware(
  socket: Socket,
  next:   (err?: Error) => void,
): Promise<void> {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    return next(new Error('Authentication required: no token provided'));
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.jti && (await isAccessTokenBlocklisted(payload.jti))) {
      return next(new Error('Authentication required: invalid or expired token'));
    }

    // Attach decoded identity to socket.data — available everywhere in server handlers
    socket.data.userId   = payload.sub;
    socket.data.username = payload.username;
    next();
  } catch {
    next(new Error('Authentication required: invalid or expired token'));
  }
}
