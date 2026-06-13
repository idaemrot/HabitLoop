import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  createHabitSchema,
  updateHabitSchema,
  habitIdSchema,
} from '../validators/habitValidators';
import {
  createCheckInSchema,
  historyQuerySchema,
} from '../validators/checkInValidators';
import {
  listHabits,
  getHabit,
  createHabitHandler,
  updateHabitHandler,
  deleteHabitHandler,
  archiveHabitHandler,
} from '../controllers/habitController';
import {
  checkInHandler,
  historyHandler,
  undoCheckInHandler,
} from '../controllers/checkInController';

// All habit routes are protected — authenticate runs on every request
const habitRouter = Router();
habitRouter.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Habit CRUD
// GET    /api/habits                        List all habits (?archived=true)
// POST   /api/habits                        Create a habit
// GET    /api/habits/:id                    Get single habit
// PATCH  /api/habits/:id                    Partial update
// DELETE /api/habits/:id                    Hard delete
// PATCH  /api/habits/:id/archive            Toggle archived
//
// Check-in sub-resources
// POST   /api/habits/:id/checkin            Mark complete for today
// DELETE /api/habits/:id/checkin/today      Undo today's check-in
// GET    /api/habits/:id/history            Paginated check-in history + stats

habitRouter.get('/',    listHabits);
habitRouter.post('/',   validate(createHabitSchema), createHabitHandler);

habitRouter.get(   '/:id',          validate(habitIdSchema), getHabit);
habitRouter.patch( '/:id',          validate(updateHabitSchema), updateHabitHandler);
habitRouter.delete('/:id',          validate(habitIdSchema), deleteHabitHandler);
habitRouter.patch( '/:id/archive',  validate(habitIdSchema), archiveHabitHandler);

// Check-in routes (ordered: specific before parameterised)
habitRouter.post(  '/:id/checkin',        validate(createCheckInSchema), checkInHandler);
habitRouter.delete('/:id/checkin/today',  validate(habitIdSchema),       undoCheckInHandler);
habitRouter.get(   '/:id/history',        validate(historyQuerySchema),   historyHandler);

export default habitRouter;
