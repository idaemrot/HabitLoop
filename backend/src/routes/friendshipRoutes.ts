import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validate }     from '../middlewares/validate';
import {
  sendRequestSchema,
  respondToRequestSchema,
  friendshipIdSchema,
} from '../validators/friendshipValidators';
import {
  sendRequest,
  respondToRequest,
  cancelRequest,
  removeFriend,
  getFriends,
  getPendingRequests,
  getSentRequests,
} from '../controllers/friendshipController';

// ─── Friendship Routes ────────────────────────────────────────────────────────
// All routes require authentication — no public friendship endpoints.
//
// Route table:
//   GET    /api/friends                    → list accepted friends
//   GET    /api/friends/requests/pending   → received pending requests (inbox)
//   GET    /api/friends/requests/sent      → outgoing pending requests
//   POST   /api/friends/request            → send friend request
//   PATCH  /api/friends/request/:id        → accept or reject request (receiver)
//   DELETE /api/friends/request/:id        → cancel outgoing request (requester)
//   DELETE /api/friends/:id                → remove accepted friendship (either party)
//
// Note: specific /requests/* paths are defined BEFORE /:id to prevent
// Express matching 'requests' as a friendship UUID param.
// ─────────────────────────────────────────────────────────────────────────────
const friendshipRouter = Router();
friendshipRouter.use(authenticate);

// ── Read routes ───────────────────────────────────────────────────────────────
friendshipRouter.get('/',                    getFriends);
friendshipRouter.get('/requests/pending',    getPendingRequests);
friendshipRouter.get('/requests/sent',       getSentRequests);

// ── Mutation routes ───────────────────────────────────────────────────────────
friendshipRouter.post(
  '/request',
  validate(sendRequestSchema),
  sendRequest,
);

friendshipRouter.patch(
  '/request/:id',
  validate(respondToRequestSchema),
  respondToRequest,
);

friendshipRouter.delete(
  '/request/:id',
  validate(friendshipIdSchema),
  cancelRequest,
);

friendshipRouter.delete(
  '/:id',
  validate(friendshipIdSchema),
  removeFriend,
);

export default friendshipRouter;
