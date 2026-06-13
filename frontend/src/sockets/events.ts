// ─── Shared socket event names ────────────────────────────────────────────────
// Mirrors backend/src/sockets/events.ts — keep in sync.
// These strings are the Socket.IO event names. TypeScript types are defined
// below to match the payload shapes emitted by the server.
// ─────────────────────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  FRIEND_CHECKED_IN:   'friend:checked-in',
  FRIEND_MILESTONE:    'friend:milestone',
  STREAK_UPDATED:      'habit:streak-updated',
  LEADERBOARD_UPDATED: 'leaderboard:updated',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Event payload types ──────────────────────────────────────────────────────

export interface FriendCheckInPayload {
  activityId:    string;
  userId:        string;
  username:      string;
  avatarUrl:     string | null;
  habitId:       string;
  habitTitle:    string;
  habitColor:    string;
  habitIcon:     string;
  currentStreak: number;
  completedDate: string;
  createdAt:     string;
}

export interface FriendMilestonePayload {
  userId:    string;
  username:  string;
  avatarUrl: string | null;
  habitId:   string;
  habitTitle: string;
  milestone: number;
  createdAt: string;
}

export interface StreakUpdatedPayload {
  habitId:       string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn:   string | null;
}
