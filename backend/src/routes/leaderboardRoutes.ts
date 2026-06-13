import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getLeaderboardHandler,
  getMyRankHandler,
} from '../controllers/leaderboardController';

// ─── Leaderboard Routes ───────────────────────────────────────────────────────
//
//   GET /api/leaderboard?period=weekly|monthly|alltime
//     Public-ish: requires auth so anonymous traffic doesn't hit Redis.
//     Returns top 50 entries (configurable via ?limit=).
//
//   GET /api/leaderboard/me?period=weekly|monthly|alltime
//     Authenticated: returns the requesting user's rank + score.
//     Uses req.user.sub from JWT — not a URL param, cannot be spoofed.
//
// Note: /me must be registered BEFORE /:id if any dynamic segment routes
// are added later, to prevent Express matching "me" as an ID.
// ─────────────────────────────────────────────────────────────────────────────

const leaderboardRouter = Router();

leaderboardRouter.use(authenticate);

leaderboardRouter.get('/me',  getMyRankHandler);
leaderboardRouter.get('/',    getLeaderboardHandler);

export default leaderboardRouter;
