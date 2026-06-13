import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes   from './authRoutes';
import habitRoutes  from './habitRoutes';

// ─── Root API Router ──────────────────────────────────────────────────────────
const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth',   authRoutes);
apiRouter.use('/habits', habitRoutes);


// TODO: Register feature routers below as they are implemented
// apiRouter.use('/users',   userRoutes);
// apiRouter.use('/habits',  habitRoutes);
// apiRouter.use('/streaks', streakRoutes);
// apiRouter.use('/friends', friendshipRoutes);
// apiRouter.use('/notifications', notificationRoutes);

export default apiRouter;
