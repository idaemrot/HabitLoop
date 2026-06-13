// ─── BullMQ Job Type Definitions ─────────────────────────────────────────────
//
// Centralised type registry for all queues in the HabitLoop background
// job system. Each queue has:
//   - A discriminated-union payload type (JobData)
//   - A result type (JobResult)
//
// Naming convention:
//   Queue key         → QUEUE_NAMES.XXX          (kebab-case string)
//   Job payload type  → XxxJobData               (union over job subtypes)
//   Job result type   → XxxJobResult
// ─────────────────────────────────────────────────────────────────────────────

// ─── Queue name registry ──────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  STREAK_VALIDATION:    'streak-validation',
  NOTIFICATIONS:        'notifications',
  LEADERBOARD_RECOMPUTE: 'leaderboard-recompute',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─────────────────────────────────────────────────────────────────────────────
// Queue: streak-validation
//
// Jobs:
//   VALIDATE_STREAK  — recalculate and repair a habit's streak from DB.
//                      Used for: daily cron sweep, post-timezone-change repair.
// ─────────────────────────────────────────────────────────────────────────────
export type StreakValidationJobData =
  | {
      type: 'VALIDATE_STREAK';
      habitId: string;
      userId:  string;
    };

export interface StreakValidationJobResult {
  habitId:       string;
  currentStreak: number;
  longestStreak: number;
  repaired:      boolean;   // true if the streak record was actually changed
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue: notifications
//
// Jobs:
//   FRIEND_CHECKIN  — notify a user that a friend has completed a habit.
//   STREAK_MILESTONE — notify a user they hit a streak milestone.
// ─────────────────────────────────────────────────────────────────────────────
export type NotificationJobData =
  | {
      type:       'FRIEND_CHECKIN';
      toUserId:   string;
      fromUserId: string;
      habitTitle: string;
      streak:     number;
    }
  | {
      type:      'STREAK_MILESTONE';
      toUserId:  string;
      habitId:   string;
      milestone: number;   // 7 | 30 | 100 | 365
    };

export interface NotificationJobResult {
  delivered: boolean;
  channel:   'socket' | 'push' | 'noop';
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue: leaderboard-recompute
//
// Jobs:
//   ADD_SCORE    — award points after a confirmed check-in commit.
//   REMOVE_SCORE — deduct points after an undo check-in commit.
//   SYNC_USER    — full recompute of a user's alltime score from PostgreSQL.
//                  Used for: Redis outage repair, admin tools.
// ─────────────────────────────────────────────────────────────────────────────
export type LeaderboardJobData =
  | {
      type:          'ADD_SCORE';
      userId:        string;
      prevStreak:    number;
      currentStreak: number;
    }
  | {
      type:             'REMOVE_SCORE';
      userId:           string;
      streakBeforeUndo: number;
      streakAfterUndo:  number;
    }
  | {
      type:   'SYNC_USER';
      userId: string;
    };

export interface LeaderboardJobResult {
  userId:    string;
  delta:     number;   // points added (+) or removed (-)
  operation: 'ADD_SCORE' | 'REMOVE_SCORE' | 'SYNC_USER';
}
