import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import Navbar from '../components/Navbar';

// ─── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good', color: '#74C0FC' };
  return { score, label: 'Strong', color: '#9DC200' };
}

// ─── Register Page ────────────────────────────────────────────────────────────
export default function RegisterPage(): JSX.Element {
  const { register, user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(password);
  const canSubmit = username.length >= 3 && email.includes('@') && password.length >= 8 && !loading;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      await register(username, email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiError = err as {
        response?: {
          data?: {
            message?: string;
            errors?: Array<{ field: string; message: string }>;
          };
        };
      };

      const data = apiError?.response?.data;

      if (data?.errors?.length) {
        const map: Record<string, string> = {};
        data.errors.forEach((e) => { map[e.field] = e.message; });
        setFieldErrors(map);
      } else {
        setError(data?.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <div className="flex flex-col items-center px-6 pt-32 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <p className="label-upper mb-2">New account</p>
            <h1 className="display-md text-ink mb-2">Create your account</h1>
            <p className="text-muted text-sm">
              Already have one?{' '}
              <Link to="/login" className="text-purple hover:text-purple-dark font-medium transition-colors">
                Sign in →
              </Link>
            </p>
          </div>

          {/* Global error */}
          {error && <div className="banner-error mb-5">⚠️ {error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="reg-username">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className={`input-field ${fieldErrors.username ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="yourname"
                required
                autoComplete="username"
                autoFocus
                minLength={3}
                maxLength={32}
              />
              {fieldErrors.username ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
              ) : (
                <p className="mt-1 text-xs text-muted">3–32 characters, letters/numbers/underscores</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="reg-email">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${fieldErrors.email ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="reg-password">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${fieldErrors.password ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: strength.score >= i ? strength.color : '#E0E0E0',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    {strength.label}
                    {strength.score < 3 && ' — add uppercase, numbers, or symbols'}
                  </p>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              id="register-submit"
              className="btn-lime w-full py-3.5 text-sm mt-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                'Create account →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
