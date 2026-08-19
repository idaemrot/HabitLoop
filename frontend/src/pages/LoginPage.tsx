import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage(): JSX.Element {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const [email, setEmail] = useState('manish@habitloop.dev');
  const [password, setPassword] = useState('Password1!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to intended page after login (or default to dashboard)
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Invalid email or password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-10 group w-fit mx-auto">
          <span
            className="font-bold text-ink group-hover:text-purple transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem' }}
          >
            HabitLoop
          </span>
        </Link>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="display-md text-ink mb-2">Welcome back</h1>
          <p className="text-muted text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple hover:text-purple-dark font-medium transition-colors">
              Sign up free →
            </Link>
          </p>
        </div>

        {/* Test credentials hint — a note, not a marketing card */}
        <p className="mb-5 text-xs text-muted text-center leading-relaxed">
          👋 Test mode — credentials are pre-filled. Just hit sign in.
        </p>

        {/* Error banner */}
        {error && <div className="banner-error mb-5">⚠️ {error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink" htmlFor="login-password">
                Password
              </label>
              <a href="#" className="text-xs text-muted hover:text-ink transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            id="login-submit"
            className="btn-lime w-full py-3.5 text-sm mt-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Sign in →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
