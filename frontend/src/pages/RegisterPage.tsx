import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { HabitChecklistMockup } from '../components/UIMockups';

// ─── Password strength helper ──────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)        score++;
  if (/[A-Z]/.test(pw))     score++;
  if (/[a-z]/.test(pw))     score++;
  if (/[0-9]/.test(pw))     score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair',   color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good',   color: '#74C0FC' };
  return              { score, label: 'Strong', color: '#D4FF4F' };
}

// ─── Register Page ────────────────────────────────────────────────────────────
export default function RegisterPage(): JSX.Element {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
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
    <div className="min-h-screen bg-canvas flex">
      {/* ── Left — Accent panel (hidden on mobile) ────────────────────── */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #74C0FC 100%)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 flex flex-col gap-6 items-center">
          <div className="text-center mb-2">
            <span className="badge-dark mb-4">Start for free</span>
            <h2
              className="text-white font-bold text-2xl mt-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
            >
              Your first habit is <br /> one tap away
            </h2>
          </div>
          <div className="animate-float">
            <HabitChecklistMockup />
          </div>
          {/* Step pills */}
          <div className="flex gap-2 mt-2">
            {['Create account', 'Add habits', 'Build streak'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`step-pill ${i === 0 ? 'active' : ''}`}>{i + 1}</span>
                <span className="text-white/60 text-xs">{s}</span>
                {i < 2 && <span className="text-white/20 mx-1">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right — Form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 max-w-lg mx-auto w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-12 group w-fit">
          <span
            className="font-bold text-ink group-hover:text-purple transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem' }}
          >
            HabitLoop
          </span>
        </Link>

        <div className="mb-8">
          <h1 className="display-md text-ink mb-2">Create your account</h1>
          <p className="text-muted text-sm">
            Already have one?{' '}
            <Link to="/login" className="text-purple hover:text-purple-dark font-medium transition-colors">
              Sign in →
            </Link>
          </p>
        </div>

        {/* Global error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

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
            className="btn-lime w-full justify-center py-3.5 text-sm mt-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating account…
              </span>
            ) : (
              'Create account →'
            )}
          </button>
        </form>

        <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
          By signing up, you agree to our{' '}
          <a href="#" className="underline hover:text-ink">Terms</a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-ink">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
