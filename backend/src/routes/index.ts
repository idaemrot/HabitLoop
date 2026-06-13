import { Router } from 'express';
import healthRoutes      from './healthRoutes';
import authRoutes        from './authRoutes';
import habitRoutes       from './habitRoutes';
import friendshipRoutes  from './friendshipRoutes';
import feedRoutes        from './feedRoutes';
import leaderboardRoutes from './leaderboardRoutes';

// ─── Root API Router ──────────────────────────────────────────────────────────
const apiRouter = Router();

apiRouter.use('/health',      healthRoutes);
apiRouter.use('/auth',        authRoutes);
apiRouter.use('/habits',      habitRoutes);
apiRouter.use('/friends',     friendshipRoutes);
apiRouter.use('/feed',        feedRoutes);
apiRouter.use('/leaderboard', leaderboardRoutes);

// TODO: Register feature routers below as they are implemented
// apiRouter.use('/users',         userRoutes);
// apiRouter.use('/streaks',       streakRoutes);
// apiRouter.use('/notifications', notificationRoutes);

export default apiRouter;
