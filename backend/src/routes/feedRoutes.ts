import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { getFeed }      from '../controllers/feedController';

// ─── Feed Routes ──────────────────────────────────────────────────────────────
// GET /api/feed  — returns paginated activity feed from accepted friends
//
// Query params:
//   ?limit=20          number of items (default 20, max 50)
//   ?cursor=<isoTs>    pagination cursor from previous page's pagination.cursor
//
// All routes require authentication — the feed is private (friends-only).
// ─────────────────────────────────────────────────────────────────────────────
const feedRouter = Router();
feedRouter.use(authenticate);

feedRouter.get('/', getFeed);

export default feedRouter;
