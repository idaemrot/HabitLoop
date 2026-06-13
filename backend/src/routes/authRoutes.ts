import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout, me } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../validators/authValidators';

// ─── Stricter rate limit for auth endpoints ────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                    // 50 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many auth attempts — please wait 15 minutes.' },
  skipSuccessfulRequests: true,  // only count failed/errored requests
});

// ─── Auth Router ─────────────────────────────────────────────────────────────
const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register',
  authLimiter,
  validate(registerSchema),
  register,
);

// POST /api/auth/login
authRouter.post('/login',
  authLimiter,
  validate(loginSchema),
  login,
);

// POST /api/auth/refresh
// Reads httpOnly cookie — no body validation needed
authRouter.post('/refresh', refresh);

// POST /api/auth/logout
// Works even if token is invalid — always clears cookie
authRouter.post('/logout', logout);

// GET /api/auth/me   (protected)
authRouter.get('/me', authenticate, me);

export default authRouter;
