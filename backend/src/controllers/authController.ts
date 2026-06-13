import type { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
} from '../services/authService';
import type { RegisterInput, LoginInput } from '../validators/authValidators';

// ─── Cookie Config ────────────────────────────────────────────────────────────
const REFRESH_COOKIE = 'hl_refresh';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'strict' as const,
  maxAge:   30 * 24 * 60 * 60 * 1000,              // 30 days in ms
  path:     '/api/auth',                             // scoped — only sent to auth endpoints
} as const;

// ─── Register ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
export async function register(
  req: Request<object, object, RegisterInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, tokens } = await registerUser(req.body);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      status: 'success',
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
export async function login(
  req: Request<object, object, LoginInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { user, tokens } = await loginUser(req.body);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Refresh ──────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Reads refresh token from httpOnly cookie, rotates it, issues new access token
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!rawRefreshToken) {
      res.status(401).json({ status: 'error', message: 'No refresh token' });
      return;
    }

    const { accessToken, refreshToken } = await refreshAccessToken(rawRefreshToken);

    // Set the new rotated refresh token cookie
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);

    res.status(200).json({
      status: 'success',
      data: { accessToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
// POST /api/auth/logout
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (rawRefreshToken) {
      await logoutUser(rawRefreshToken);
    }

    // Clear the cookie regardless of whether the token was valid
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });

    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ─── Get Current User ─────────────────────────────────────────────────────────
// GET /api/auth/me  (protected — requires authenticate middleware)
export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    const user = await getCurrentUser(req.user.sub);

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}
