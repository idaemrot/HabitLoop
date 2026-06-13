import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt';
import { AppError } from './errorHandler';

// ─── Augment Express Request ──────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// ─── authenticate — required auth guard ──────────────────────────────────────
// Usage:  router.get('/me', authenticate, handler)
//
// Reads access token from Authorization: Bearer <token>
// NEVER reads from cookies (refresh token only lives in httpOnly cookies)
// NEVER reads from query params or body
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.slice(7); // strip 'Bearer '

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401));
  }
}

// ─── optionalAuthenticate — attaches user if valid token present ──────────────
// Usage:  router.get('/feed', optionalAuthenticate, handler)
// Does not reject the request if no token — req.user will be undefined
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch {
      // Invalid token for optional auth — silently ignore, req.user stays undefined
    }
  }

  next();
}

// ─── requireOwnership — confirm req.user.sub matches a resource's userId ─────
// Usage:  router.delete('/habits/:id', authenticate, requireOwnership('userId'), handler)
// Expects res.locals.resourceUserId to be set by a prior middleware or use param
export function requireOwnership(field: 'userId' | 'requesterId' | 'receiverId' = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceUserId = res.locals[field] as string | undefined;
    if (!resourceUserId) {
      return next(new AppError('Resource not found', 404));
    }
    if (req.user?.sub !== resourceUserId) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}

// Re-export type for convenience
export type { AccessTokenPayload as JwtPayload };
