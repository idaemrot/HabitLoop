import type { Request, Response, NextFunction } from 'express';
import { getLeaderboard, getUserRank, type LeaderboardPeriod } from '../services/leaderboardService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VALID_PERIODS: ReadonlySet<string> = new Set(['weekly', 'monthly', 'alltime']);

function parsePeriod(raw: unknown): LeaderboardPeriod | null {
  if (typeof raw !== 'string' || !VALID_PERIODS.has(raw)) return null;
  return raw as LeaderboardPeriod;
}

// ─── GET /api/leaderboard?period=weekly|monthly|alltime ───────────────────────
//
// Returns the top 50 entries for the requested period.
// Redis is the source of truth — PostgreSQL is only queried to hydrate usernames.
//
// Query params:
//   period  (required)  weekly | monthly | alltime
//   limit   (optional)  1–100, default 50
//
// Response:
//   200 { data: { period, entries: [{ rank, userId, username, avatarUrl, score }] } }
//   400 Invalid period
// ─────────────────────────────────────────────────────────────────────────────
export async function getLeaderboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const period = parsePeriod(req.query['period']);
    if (!period) {
      res.status(400).json({
        error: "Invalid period. Must be one of: 'weekly', 'monthly', 'alltime'.",
      });
      return;
    }

    const rawLimit = parseInt(String(req.query['limit'] ?? '50'), 10);
    const limit    = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

    const entries = await getLeaderboard(period, limit);

    res.status(200).json({
      data: { period, entries },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/leaderboard/me?period=weekly|monthly|alltime ───────────────────
//
// Returns the authenticated user's rank and score for the requested period.
//
// Response:
//   200 { data: { period, rank, score, user: { id, username } } }
//   404 User has no score in this leaderboard yet
//   400 Invalid period
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyRankHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const period = parsePeriod(req.query['period']);
    if (!period) {
      res.status(400).json({
        error: "Invalid period. Must be one of: 'weekly', 'monthly', 'alltime'.",
      });
      return;
    }

    const userId = req.user!.sub;
    const result = await getUserRank(userId, period);

    if (!result) {
      res.status(404).json({
        error: 'No leaderboard entry found for this user and period.',
      });
      return;
    }

    res.status(200).json({
      data: {
        period,
        rank:  result.rank,
        score: result.score,
        user:  { id: userId, username: req.user!.username },
      },
    });
  } catch (err) {
    next(err);
  }
}
