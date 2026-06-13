import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { authApi, setAccessToken } from '../api/client';
import { useSocket }               from '../hooks/useSocket';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:            User | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (email: string, password: string) => Promise<void>;
  register:        (username: string, email: string, password: string) => Promise<void>;
  logout:          () => Promise<void>;
  refreshUser:     () => Promise<void>;
}

type AuthApiResponse = {
  data: { data: { user: User; accessToken: string } };
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user,        setUser]        = useState<User | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);  // true on mount — check session
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  // Wire socket lifecycle to access token — connects when authenticated, disconnects on logout
  useSocket(accessToken);

  // ── Attempt to restore session via refresh cookie on app load ─────────────
  useEffect(() => {
    let cancelled = false;

    async function tryRestoreSession(): Promise<void> {
      try {
        // POST /auth/refresh — browser sends httpOnly cookie automatically
        const res = await authApi.refresh();
        const newToken: string = res.data?.data?.accessToken;
        if (!newToken) throw new Error('No token in refresh response');

        setAccessToken(newToken);
        setAccessTokenState(newToken);

        // Fetch full user profile with the new access token
        const meRes = await authApi.me();
        if (!cancelled) {
          setUser(meRes.data?.data?.user ?? null);
        }
      } catch {
        // No valid session — user is logged out
        setAccessToken(null);
        setAccessTokenState(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void tryRestoreSession();
    return () => { cancelled = true; };
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await authApi.login({ email, password }) as AuthApiResponse;
    const { user: loggedInUser, accessToken: token } = res.data.data;

    setAccessToken(token);
    setAccessTokenState(token);
    setUser(loggedInUser);
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (username: string, email: string, password: string): Promise<void> => {
      const res = await authApi.register({ username, email, password }) as AuthApiResponse;
      const { user: newUser, accessToken: token } = res.data.data;

      setAccessToken(token);
      setAccessTokenState(token);
      setUser(newUser);
    },
    [],
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Even if logout API fails, clear client state
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  // ── Refresh user profile (e.g. after profile update) ─────────────────────
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const res = await authApi.me();
      setUser(res.data?.data?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
