import type { Request, Response, NextFunction } from 'express';
import {
  getUserHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
} from '../services/habitService';
import type { CreateHabitInput, UpdateHabitInput } from '../validators/habitValidators';

// ─── GET /api/habits ──────────────────────────────────────────────────────────
// Returns all habits for the authenticated user
// Query: ?archived=true  to include archived habits
export async function listHabits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId         = req.user!.sub;
    const includeArchived = req.query.archived === 'true';

    const habits = await getUserHabits(userId, includeArchived);
    res.status(200).json({ status: 'success', data: { habits } });
  } catch (err) { next(err); }
}

// ─── GET /api/habits/:id ──────────────────────────────────────────────────────
export async function getHabit(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const habit = await getHabitById(req.params.id, req.user!.sub);
    res.status(200).json({ status: 'success', data: { habit } });
  } catch (err) { next(err); }
}

// ─── POST /api/habits ─────────────────────────────────────────────────────────
export async function createHabitHandler(
  req: Request<object, object, CreateHabitInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const habit = await createHabit(req.user!.sub, req.body);
    res.status(201).json({ status: 'success', data: { habit } });
  } catch (err) { next(err); }
}

// ─── PATCH /api/habits/:id ────────────────────────────────────────────────────
export async function updateHabitHandler(
  req: Request<{ id: string }, object, UpdateHabitInput>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const habit = await updateHabit(req.params.id, req.user!.sub, req.body);
    res.status(200).json({ status: 'success', data: { habit } });
  } catch (err) { next(err); }
}

// ─── DELETE /api/habits/:id ───────────────────────────────────────────────────
export async function deleteHabitHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await deleteHabit(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── PATCH /api/habits/:id/archive ───────────────────────────────────────────
export async function archiveHabitHandler(
  req: Request<{ id: string }, object, { archived: boolean }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const archived = req.body.archived ?? true;
    const habit    = await archiveHabit(req.params.id, req.user!.sub, archived);
    res.status(200).json({ status: 'success', data: { habit } });
  } catch (err) { next(err); }
}
