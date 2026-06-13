import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';

// ─── BullMQ Connection Options ────────────────────────────────────────────────
// BullMQ bundles its own ioredis internally, so we pass connection options
// directly (URL string) rather than sharing the singleton Redis client.
function getConnectionOptions(): { url: string } {
  return { url: env.REDIS_URL };
}

// ─── Queue Names ──────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  STREAK_CALCULATION: 'streak:calculation',
  NOTIFICATIONS: 'notifications',
  EMAIL: 'email',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Queue Factory ────────────────────────────────────────────────────────────
export function createQueue(name: QueueName): Queue {
  return new Queue(name, {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
}

// ─── Queue Instances ──────────────────────────────────────────────────────────
export const streakQueue = createQueue(QUEUE_NAMES.STREAK_CALCULATION);
export const notificationQueue = createQueue(QUEUE_NAMES.NOTIFICATIONS);
export const emailQueue = createQueue(QUEUE_NAMES.EMAIL);

// ─── Worker Stubs (to be implemented per feature) ────────────────────────────
export function startWorkers(): void {
  // Streak calculation worker
  new Worker(
    QUEUE_NAMES.STREAK_CALCULATION,
    async (job) => {
      // TODO: Implement streak calculation logic
      console.info(`Processing job ${job.id} in ${QUEUE_NAMES.STREAK_CALCULATION}`);
    },
    { connection: getConnectionOptions() },
  );

  // Notification worker
  new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job) => {
      // TODO: Implement notification dispatch logic
      console.info(`Processing job ${job.id} in ${QUEUE_NAMES.NOTIFICATIONS}`);
    },
    { connection: getConnectionOptions() },
  );

  console.info('✅ BullMQ workers started');
}
