import type { Request, Response, NextFunction } from 'express';
import * as feedService from '../services/feedService';

// ─── GET /api/feed ────────────────────────────────────────────────────────────
// Query params:
//   limit  — number of items per page (default 20, max 50)
//   cursor — ISO timestamp from previous response's pagination.cursor
export async function getFeed(
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const limit  = req.query.limit  ? parseInt(req.query.limit  as string, 10) : 20;
    const cursor = req.query.cursor ? (req.query.cursor as string)              : undefined;

    const feed = await feedService.getFeed(userId, limit, cursor);
    res.status(200).json({ status: 'success', data: feed });
  } catch (err) {
    next(err);
  }
}
