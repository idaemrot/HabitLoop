// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page:       number;
    pageSize:   number;
    total:      number;
    totalPages: number;
  };
}

// ─── User Types ───────────────────────────────────────────────────────────────
export interface User {
  id:        string;
  email:     string;
  username:  string;
  avatarUrl?: string;
  timezone:  string;
  createdAt: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
}

export interface LoginPayload {
  email:    string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  username: string;
}

// ─── Habit Types ──────────────────────────────────────────────────────────────
export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';

export interface Habit {
  id:          string;
  userId:      string;
  title:       string;           // renamed from name to match schema
  description: string | null;
  frequency:   HabitFrequency;
  targetDays:  number;
  color:       string;
  icon:        string;
  isArchived:  boolean;
  createdAt:   string;
  updatedAt:   string;
  streak:      Streak | null;
}

export interface CreateHabitPayload {
  title:        string;
  description?: string;
  frequency?:   HabitFrequency;
  color?:       string;
  icon?:        string;
}

export interface UpdateHabitPayload {
  title?:       string;
  description?: string;
  frequency?:   HabitFrequency;
  color?:       string;
  icon?:        string;
  isArchived?:  boolean;
}

// ─── Streak Types ─────────────────────────────────────────────────────────────
export interface Streak {
  id:            string;
  habitId:       string;
  userId:        string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn:   string | null;
  updatedAt:     string;
}

// ─── Check-In Types ───────────────────────────────────────────────────────────
export interface CheckIn {
  id:            string;
  habitId:       string;
  userId:        string;
  completedDate: string;
  note:          string | null;
  createdAt:     string;
}
