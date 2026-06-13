import { Router } from 'express';
import healthRoutes from './healthRoutes';

// ─── Root API Router ──────────────────────────────────────────────────────────
// All feature routers are registered here, then mounted on /api in app.ts
const apiRouter = Router();

apiRouter.use('/health', healthRoutes);

// TODO: Register feature routers below as they are implemented
// apiRouter.use('/auth',   authRoutes);
// apiRouter.use('/users',  userRoutes);
// apiRouter.use('/habits', habitRoutes);
// apiRouter.use('/streaks', streakRoutes);

export default apiRouter;
