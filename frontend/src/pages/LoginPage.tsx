import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatsMockup } from '../components/UIMockups';

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to auth API in Task 2
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* ── Left — Form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 max-w-lg mx-auto w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-12 group w-fit">
          <span className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center text-base">🔁</span>
          <span
            className="font-bold text-ink group-hover:text-purple transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem' }}
          >
            HabitLoop
          </span>
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="display-md text-ink mb-2">Welcome back</h1>
          <p className="text-muted text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple hover:text-purple-dark font-medium transition-colors">
              Sign up free →
            </Link>
          </p>
        </div>

        {/* Social login */}
        <div className="flex flex-col gap-3 mb-6">
          <button className="btn-ghost w-full justify-center gap-3 py-3">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button className="btn-ghost w-full justify-center gap-3 py-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted">or sign in with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-ink" htmlFor="password">
                Password
              </label>
              <a href="#" className="text-xs text-muted hover:text-ink transition-colors">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
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
            disabled={loading}
            className="btn-lime w-full justify-center py-3.5 text-sm mt-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in →'
            )}
          </button>
        </form>

        <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
          By signing in, you agree to our{' '}
          <a href="#" className="underline hover:text-ink">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-ink">Privacy Policy</a>.
        </p>
      </div>

      {/* ── Right — Accent panel (hidden on mobile) ─────────────────────── */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6C5CE7 0%, #74C0FC 100%)',
        }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Floating content */}
        <div className="relative z-10 flex flex-col gap-6 items-center">
          <div className="text-center mb-4">
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-2">
              Your progress
            </p>
            <h2
              className="text-white font-bold text-2xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.02em' }}
            >
              47 days and counting 🔥
            </h2>
          </div>
          <div className="animate-float">
            <StatsMockup />
          </div>
          {/* Testimonial */}
          <div className="panel-dark max-w-xs text-center px-6 py-4 mt-4">
            <p className="text-sm text-white/80 italic leading-relaxed">
              "HabitLoop helped me meditate every single day for 3 months straight. I've tried 6 other apps."
            </p>
            <p className="text-xs text-white/40 mt-2 font-medium">— Alex K., Product Designer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
