import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
//  HabitLoop API Client
//
//  Token strategy (per spec):
//    - Access token  → stored in memory only (React state via AuthContext)
//    - Refresh token → httpOnly secure cookie (set by server, never JS-readable)
//
//  Never use localStorage for tokens.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

// ─── In-memory access token store ─────────────────────────────────────────────
// This module holds a single reference that AuthContext writes to after login/refresh.
// It is intentionally NOT exported as a reactive value — use AuthContext for that.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL:         BASE_URL,
  timeout:         10_000,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true,  // required — sends httpOnly refresh cookie to /api/auth/*
});

// ─── Request Interceptor — Attach access token from memory ───────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — Auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string): void {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only intercept 401 on non-auth endpoints (avoid infinite loop on /auth/refresh)
    const isAuthEndpoint = original.url?.includes('/auth/');
    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          original._retry = true;
          resolve(apiClient(original));
        });
        // Reject after 10s if refresh never resolves
        setTimeout(() => reject(new Error('Refresh timeout')), 10_000);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // POST /api/auth/refresh — refresh token sent automatically via httpOnly cookie
      const { data } = await axios.post<{ status: string; data: { accessToken: string } }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.data.accessToken;
      setAccessToken(newToken);
      processQueue(newToken);

      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      // Refresh failed — clear token and redirect to login
      setAccessToken(null);
      refreshQueue = [];
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Typed API helpers ─────────────────────────────────────────────────────────
export const healthApi = {
  check: () => apiClient.get<{ status: string; timestamp: string }>('/health'),
};

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    apiClient.post('/auth/register', body),

  login: (body: { email: string; password: string }) =>
    apiClient.post('/auth/login', body),

  refresh: () => apiClient.post('/auth/refresh'),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get('/auth/me'),
};

export const habitApi = {
  list:    (archived = false) =>
    apiClient.get(`/habits${archived ? '?archived=true' : ''}`),

  getById: (id: string) =>
    apiClient.get(`/habits/${id}`),

  create: (body: {
    title:        string;
    description?: string;
    frequency?:   string;
    color?:       string;
    icon?:        string;
  }) => apiClient.post('/habits', body),

  update: (id: string, body: {
    title?:       string;
    description?: string;
    frequency?:   string;
    color?:       string;
    icon?:        string;
    isArchived?:  boolean;
  }) => apiClient.patch(`/habits/${id}`, body),

  delete: (id: string) =>
    apiClient.delete(`/habits/${id}`),

  archive: (id: string, archived = true) =>
    apiClient.patch(`/habits/${id}/archive`, { archived }),
};

export const checkInApi = {
  // POST /api/habits/:id/checkin — mark today complete
  create: (habitId: string, note?: string) =>
    apiClient.post(`/habits/${habitId}/checkin`, { note }),

  // DELETE /api/habits/:id/checkin/today — undo today's check-in
  undo: (habitId: string) =>
    apiClient.delete(`/habits/${habitId}/checkin/today`),

  // GET /api/habits/:id/history — paginated history + stats
  history: (habitId: string, page = 1, pageSize = 30) =>
    apiClient.get(`/habits/${habitId}/history?page=${page}&pageSize=${pageSize}`),
};

export const feedApi = {
  // GET /api/feed — cursor-based paginated feed
  list: (limit = 20, cursor?: string) => {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    return apiClient.get(`/feed?${params.toString()}`);
  },
};

export const leaderboardApi = {
  // GET /api/leaderboard?period=weekly|monthly|alltime[&limit=N]
  list: (period: 'weekly' | 'monthly' | 'alltime', limit = 50) =>
    apiClient.get(`/leaderboard?period=${period}&limit=${limit}`),

  // GET /api/leaderboard/me?period=weekly|monthly|alltime
  myRank: (period: 'weekly' | 'monthly' | 'alltime') =>
    apiClient.get(`/leaderboard/me?period=${period}`),
};
