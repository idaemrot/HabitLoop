import { Router } from 'express';
import { authenticate } from '../middlewares';
import { prisma } from '../config/database';
import type { Request, Response, NextFunction } from 'express';

const userRouter = Router();
userRouter.use(authenticate);

// ─── GET /api/users/search?q=<username> ──────────────────────────────────────
// Search users by username prefix (case-insensitive). Excludes self.
// Returns max 10 results with only public profile fields.
userRouter.get('/search', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = ((req.query.q as string) ?? '').trim();
    if (!q || q.length < 2) {
      res.status(400).json({ status: 'error', message: 'Query must be at least 2 characters' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        id: { not: req.user!.sub },  // exclude self
      },
      select: { id: true, username: true, avatarUrl: true },
      take: 10,
      orderBy: { username: 'asc' },
    });

    res.json({ status: 'success', data: { users } });
  } catch (err) {
    next(err);
  }
});

export default userRouter;
