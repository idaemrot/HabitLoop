import type { Request, Response, NextFunction } from 'express';
import * as friendshipService from '../services/friendshipService';

// ─── POST /api/friends/request ────────────────────────────────────────────────
export async function sendRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requesterId = req.user!.sub;
    const { receiverId } = req.body as { receiverId: string };

    const friendship = await friendshipService.sendFriendRequest(requesterId, receiverId);
    res.status(201).json({ status: 'success', data: { friendship } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/friends/request/:id ──────────────────────────────────────────
// Accept or reject an incoming request. Action from body: 'ACCEPTED' | 'REJECTED'
export async function respondToRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const receiverId    = req.user!.sub;
    const friendshipId  = req.params.id;
    const { action }    = req.body as { action: 'ACCEPTED' | 'DECLINED' };

    const friendship = await friendshipService.respondToRequest(friendshipId, receiverId, action);
    res.status(200).json({ status: 'success', data: { friendship } });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/friends/request/:id ─────────────────────────────────────────
// Cancel an outgoing PENDING request (requester only)
export async function cancelRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const requesterId  = req.user!.sub;
    const friendshipId = req.params.id;

    await friendshipService.cancelRequest(friendshipId, requesterId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/friends/:id ──────────────────────────────────────────────────
// Remove an accepted friendship (either party)
export async function removeFriend(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId       = req.user!.sub;
    const friendshipId = req.params.id;

    await friendshipService.removeFriend(friendshipId, userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/friends ─────────────────────────────────────────────────────────
// List accepted friends
export async function getFriends(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId  = req.user!.sub;
    const friends = await friendshipService.getFriends(userId);
    res.status(200).json({ status: 'success', data: { friends } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/friends/requests/pending ───────────────────────────────────────
// Received pending requests (inbox)
export async function getPendingRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId   = req.user!.sub;
    const requests = await friendshipService.getPendingRequests(userId);
    res.status(200).json({ status: 'success', data: { requests } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/friends/requests/sent ──────────────────────────────────────────
// Outgoing pending requests
export async function getSentRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId   = req.user!.sub;
    const requests = await friendshipService.getSentRequests(userId);
    res.status(200).json({ status: 'success', data: { requests } });
  } catch (err) {
    next(err);
  }
}
