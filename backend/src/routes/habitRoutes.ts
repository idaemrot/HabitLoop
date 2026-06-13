import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  createHabitSchema,
  updateHabitSchema,
  habitIdSchema,
} from '../validators/habitValidators';
import {
  listHabits,
  getHabit,
  createHabitHandler,
  updateHabitHandler,
  deleteHabitHandler,
  archiveHabitHandler,
} from '../controllers/habitController';

// All habit routes are protected — authenticate runs on every request
const habitRouter = Router();
habitRouter.use(authenticate);

// ─── Routes ───────────────────────────────────────────────────────────────────
// GET    /api/habits            List all habits for user (?archived=true optional)
// POST   /api/habits            Create a habit
// GET    /api/habits/:id        Get a single habit
// PATCH  /api/habits/:id        Update a habit
// DELETE /api/habits/:id        Hard-delete a habit
// PATCH  /api/habits/:id/archive  Toggle archive status

habitRouter.get('/',    listHabits);
habitRouter.post('/',   validate(createHabitSchema), createHabitHandler);

habitRouter.get(   '/:id',          validate(habitIdSchema), getHabit);
habitRouter.patch( '/:id',          validate(updateHabitSchema), updateHabitHandler);
habitRouter.delete('/:id',          validate(habitIdSchema), deleteHabitHandler);
habitRouter.patch( '/:id/archive',  validate(habitIdSchema), archiveHabitHandler);

export default habitRouter;
