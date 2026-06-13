// ─── Socket Event Registry ────────────────────────────────────────────────────
//
// Single source of truth for all Socket.IO event names.
// Imported by both the server (emitters) and the frontend (listeners).
// Keeping names here prevents typos and enables IDE autocomplete.
//
// Convention:
//   Server → Client events: noun:verb  e.g. "habit:checked-in"
//   Client → Server events: would follow the same pattern if needed
// ─────────────────────────────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // ── Server → Client ────────────────────────────────────────────────────────

  /**
   * A friend completed a habit.
   * Payload: FriendCheckInEvent
   * Sent to: all sockets in each friend's personal room
   */
  FRIEND_CHECKED_IN: 'friend:checked-in',

  /**
   * A friend hit a streak milestone.
   * Payload: FriendMilestoneEvent
   * Sent to: all sockets in each friend's personal room
   */
  FRIEND_MILESTONE: 'friend:milestone',

  /**
   * The current user's own habit dashboard has new data (e.g. streak updated).
   * Payload: OwnStreakUpdatedEvent
   * Sent to: the socket that just checked in (confirmation / race guard)
   */
  STREAK_UPDATED: 'habit:streak-updated',

} as const;

// ─── Event Payload Types ──────────────────────────────────────────────────────

export interface FriendCheckInEvent {
  activityId:    string;
  userId:        string;   // the friend who checked in
  username:      string;
  avatarUrl:     string | null;
  habitId:       string;
  habitTitle:    string;
  habitColor:    string;
  habitIcon:     string;
  currentStreak: number;
  completedDate: string;  // YYYY-MM-DD local date string
  createdAt:     string;  // ISO timestamp
}

export interface FriendMilestoneEvent {
  userId:        string;
  username:      string;
  avatarUrl:     string | null;
  habitId:       string;
  habitTitle:    string;
  milestone:     number;  // 7, 30, 100, 365
  createdAt:     string;
}

export interface OwnStreakUpdatedEvent {
  habitId:       string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn:   string | null;
}
