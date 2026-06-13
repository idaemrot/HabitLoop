import { systemCronQueue } from './queues';

/**
 * Initializes the repeatable jobs in BullMQ.
 * Must be called after the Redis connection is established.
 */
export async function setupScheduler(): Promise<void> {
  // We use an hourly cron to sweep users dynamically based on their timezone.
  // This allows users in PST to receive their "midnight" summary at their midnight,
  // instead of UTC midnight.
  await systemCronQueue.add(
    'daily-sweep',
    { type: 'DAILY_SWEEP' },
    {
      repeat: {
        pattern: '0 * * * *', // Run at minute 0 past every hour
      },
      // Job ID prevents duplicate repeatable jobs if server restarts
      jobId: 'repeatable-daily-sweep',
    },
  );

  console.info('🕒 BullMQ scheduler initialized (Hourly sweep active)');
}
