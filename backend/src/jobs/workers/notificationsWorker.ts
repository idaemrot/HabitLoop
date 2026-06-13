// ─── Notifications Worker ─────────────────────────────────────────────────────
//
// Processes: notifications queue
//
// Job types:
//   FRIEND_CHECKIN   — emit 'friend:checked-in' to a specific user's socket room.
//   STREAK_MILESTONE — emit 'friend:milestone'  to a specific user's socket room.
//
// Current delivery channel: Socket.IO (real-time only).
// Future channels: push notifications, in-app notification table.
//
// Design notes:
//   • The worker delivers to a SPECIFIC user (toUserId), not broadcast.
//   • Socket emission is best-effort: if the user is offline, the event is
//     dropped (no persistent notification storage in current schema).
//   • The result records which channel was used so callers can observe delivery.
//   • 'noop' means the user was offline — not an error, job still completes.
// ─────────────────────────────────────────────────────────────────────────────

import { Worker, type Job } from 'bullmq';
import { getBullMQConnection }               from '../../config/bullmq';
import { getIO }                             from '../../sockets';
import { userRoom }                          from '../../sockets/connectionManager';
import { SOCKET_EVENTS }                     from '../../sockets/events';
import {
  QUEUE_NAMES,
  type NotificationJobData,
  type NotificationJobResult,
} from '../types';

// ─── Processor ───────────────────────────────────────────────────────────────
async function processNotification(
  job: Job<NotificationJobData, NotificationJobResult>,
): Promise<NotificationJobResult> {
  const { type } = job.data;

  switch (type) {
    case 'FRIEND_CHECKIN': {
      const { toUserId, fromUserId, habitTitle, streak } = job.data;

      getIO().to(userRoom(toUserId)).emit(SOCKET_EVENTS.FRIEND_CHECKED_IN, {
        userId:        fromUserId,
        habitTitle,
        currentStreak: streak,
      });

      console.info(
        `[NotifWorker] FRIEND_CHECKIN → user:${toUserId} from:${fromUserId}`,
      );
      return { delivered: true, channel: 'socket' };
    }

    case 'STREAK_MILESTONE': {
      const { toUserId, habitId, milestone } = job.data;

      getIO().to(userRoom(toUserId)).emit(SOCKET_EVENTS.FRIEND_MILESTONE, {
        userId:    toUserId,
        habitId,
        milestone,
        createdAt: new Date().toISOString(),
      });

      console.info(
        `[NotifWorker] STREAK_MILESTONE → user:${toUserId} milestone:${milestone}`,
      );
      return { delivered: true, channel: 'socket' };
    }

    default: {
      // Exhaustiveness guard — TypeScript will catch this at compile time
      const _exhaustive: never = job.data;
      throw new Error(
        `[NotifWorker] Unknown job type: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

// ─── Worker factory ───────────────────────────────────────────────────────────
export function createNotificationsWorker(): Worker<
  NotificationJobData,
  NotificationJobResult
> {
  const worker = new Worker<NotificationJobData, NotificationJobResult>(
    QUEUE_NAMES.NOTIFICATIONS,
    processNotification,
    {
      connection:  getBullMQConnection(),
      concurrency: 20,   // notifications are cheap I/O — high concurrency is fine
    },
  );

  worker.on('completed', (job, result) => {
    console.info(
      `[NotifWorker] ✅ job:${job.id} completed — ` +
      `type:${job.data.type} channel:${result.channel}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[NotifWorker] ❌ job:${job?.id ?? '?'} failed — ` +
      `attempt ${(job?.attemptsMade ?? 0) + 1}: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[NotifWorker] worker error:', err.message);
  });

  return worker;
}
