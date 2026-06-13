// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  timezone: string;
  createdAt: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

// ─── Habit Types ─────────────────────────────────────────────────────────────
export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetDays: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  streak?: Streak;
}

// ─── Streak Types ─────────────────────────────────────────────────────────────
export interface Streak {
  id: string;
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn?: string;
}

// ─── Check-In Types ───────────────────────────────────────────────────────────
export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  note?: string;
  createdAt: string;
}
