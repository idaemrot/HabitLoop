import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';

const router = Router();

/**
 * GET /api/health
 * Returns service health status for database and Redis.
 */
router.get('/', healthCheck);

export default router;
