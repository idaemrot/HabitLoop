import { describe, it, expect, vi } from 'vitest';
import type { Job } from 'bullmq';
import { processNotification } from './notificationsWorker';
import type { NotificationJobData, NotificationJobResult } from '../types';
import type { FriendCheckInEvent } from '../../sockets/events';

// ─── Mocks ─────────────────────────────────────────────────────────────────
// processNotification only needs Socket.IO for FRIEND_CHECKIN — no Redis/DB.
const emit = vi.fn();
const to = vi.fn(() => ({ emit }));

vi.mock('../../sockets', () => ({
  getIO: (): { to: typeof to } => ({ to }),
}));

vi.mock('../../sockets/connectionManager', () => ({
  userRoom: (userId: string): string => `user:${userId}`,
}));

function fakeJob(data: NotificationJobData): Job<NotificationJobData, NotificationJobResult> {
  return { data } as Job<NotificationJobData, NotificationJobResult>;
}

// Every field a FriendCheckInEvent consumer (frontend FriendFeed.tsx) reads
// unconditionally — this is exactly the set that was previously undefined
// and crashed the frontend with `item.username.charAt is not a function`.
const REQUIRED_EVENT_FIELDS: Array<keyof FriendCheckInEvent> = [
  'activityId',
  'userId',
  'username',
  'avatarUrl',
  'habitId',
  'habitTitle',
  'habitColor',
  'habitIcon',
  'currentStreak',
  'completedDate',
  'createdAt',
];

describe('notificationsWorker — FRIEND_CHECKIN', () => {
  it('emits a complete FriendCheckInEvent payload to the recipient room', async () => {
    const jobData: NotificationJobData = {
      type: 'FRIEND_CHECKIN',
      toUserId: 'friend-1',
      activityId: 'activity-1',
      userId: 'checker-1',
      username: 'manish',
      avatarUrl: null,
      habitId: 'habit-1',
      habitTitle: 'Morning run',
      habitColor: '#6C5CE7',
      habitIcon: 'run',
      currentStreak: 8,
      completedDate: '2026-08-19',
      createdAt: '2026-08-19T12:00:00.000Z',
    };

    const result = await processNotification(fakeJob(jobData));

    // Routed to the correct friend's personal room
    expect(to).toHaveBeenCalledWith('user:friend-1');

    // The emitted payload has every field FriendFeed.tsx reads unconditionally
    expect(emit).toHaveBeenCalledTimes(1);
    const [eventName, payload] = emit.mock.calls[0] as [string, FriendCheckInEvent];
    expect(eventName).toBe('friend:checked-in');

    for (const field of REQUIRED_EVENT_FIELDS) {
      expect(payload[field], `payload.${field} must not be undefined`).not.toBeUndefined();
    }

    expect(payload).toEqual({
      activityId: 'activity-1',
      userId: 'checker-1',
      username: 'manish',
      avatarUrl: null,
      habitId: 'habit-1',
      habitTitle: 'Morning run',
      habitColor: '#6C5CE7',
      habitIcon: 'run',
      currentStreak: 8,
      completedDate: '2026-08-19',
      createdAt: '2026-08-19T12:00:00.000Z',
    });

    expect(result).toEqual({ delivered: true, channel: 'socket' });
  });
});
