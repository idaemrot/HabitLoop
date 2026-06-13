import type { Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import {
  createCheckIn,
  getHabitHistory,
  undoTodayCheckIn,
} from '../services/checkInService';

// ─── POST /api/habits/:id/checkin ─────────────────────────────────────────────
export async function checkInHandler(
  req: Request<{ id: string }, object, { note?: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await createCheckIn(
      req.params.id,
      req.user!.sub,
      req.body.note,
    );
    res.status(201).json({
      status: 'success',
      data:   result,
    });
  } catch (err) { next(err); }
}

// ─── GET /api/habits/:id/history ─────────────────────────────────────────────────
// Note: Express query params are always ParsedQs (strings/arrays).
// We use validate(historyQuerySchema) which transforms the values to numbers
// via Zod, but the Request generic must stay as ParsedQs for TS compatibility.
export async function historyHandler(
  req: Request<{ id: string }, object, object, ParsedQs>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(String(req.query.page     ?? '1'),  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '30'), 10)));
    const result = await getHabitHistory(
      req.params.id,
      req.user!.sub,
      page,
      pageSize,
    );
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

// ─── DELETE /api/habits/:id/checkin/today ─────────────────────────────────────
export async function undoCheckInHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await undoTodayCheckIn(req.params.id, req.user!.sub);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}
