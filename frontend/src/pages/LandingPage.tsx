import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../store/authContext';
import { HabitIcon, type HabitIconName } from '../components/HabitIcon';

// ─── Product preview ──────────────────────────────────────────────────────────
// A real recreation of the actual dashboard UI (same tokens, same HabitCard
// pattern — color edge accent, icon badge, streak line, circular check
// control) rather than a generic illustration. This is what "show the
// product" means here.
function DashboardPreview(): JSX.Element {
  const rows: Array<{ icon: HabitIconName; color: string; title: string; streak: number; done: boolean }> = [
    { icon: 'meditate', color: '#6C5CE7', title: 'Morning meditation', streak: 14, done: true },
    { icon: 'book',     color: '#74C0FC', title: 'Read 30 min',        streak: 7,  done: true },
    { icon: 'run',      color: '#D4FF4F', title: 'Evening run',        streak: 3,  done: false },
  ];

  return (
    <div className="card p-5 w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-ink">Today's progress</p>
        <p className="text-sm text-muted tabular-nums">2/3</p>
      </div>
      <div className="h-2 rounded-full bg-border/60 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-lime" style={{ width: '66%' }} />
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div
            key={r.title}
            className="flex items-center gap-3 py-2 pl-3"
            style={{ borderLeft: `3px solid ${r.color}` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-ink shrink-0"
              style={{ backgroundColor: r.color, opacity: r.done ? 0.65 : 1 }}
            >
              <HabitIcon icon={r.icon} width={16} height={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold truncate ${r.done ? 'text-muted' : 'text-ink'}`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {r.title}
              </p>
              <p className="text-xs text-muted mt-0.5">🔥 {r.streak} days</p>
            </div>
            <div
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                r.done ? 'bg-lime border-lime text-ink' : 'border-border'
              }`}
            >
              {r.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Marketing Landing Page ───────────────────────────────────────────────────
export default function LandingPage(): JSX.Element {
  const { user } = useAuth();

  const benefits = [
    'One tap to check in — streaks and best-ever are calculated for you',
    "See friends' progress the moment they check in",
    'Compete on a live weekly, monthly, and all-time leaderboard',
  ];

  const steps = [
    { title: 'Define your habits', body: 'Add a name, frequency, color, and icon. Takes 30 seconds.' },
    { title: 'Check in daily',     body: 'One tap to log completion. Streaks calculated automatically.' },
    { title: 'Stay accountable',   body: 'Friends see your progress, and the leaderboard keeps you honest.' },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="features" className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] gap-16 items-center">
          {/* Copy */}
          <div>
            <h1 className="display-xl text-left text-ink mb-6 animate-fade-up animate-delay-100">
              Build habits that{' '}
              <span className="relative inline-block mt-2">
                <span className="bg-lime px-4 py-1 rounded-xl border border-border shadow-sm inline-block -rotate-1">actually stick.</span>
              </span>
            </h1>
            <p className="text-left text-muted text-lg animate-fade-up animate-delay-200 max-w-lg mb-8 leading-relaxed">
              Track your habits, check in once a day, and let HabitLoop keep score of the streak.
            </p>

            <ul className="flex flex-col gap-3 mb-9 animate-fade-up animate-delay-300 max-w-md">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-dark shrink-0 mt-2" aria-hidden="true" />
                  <p className="text-sm text-ink leading-relaxed">{b}</p>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 animate-fade-up animate-delay-400">
              {user ? (
                <Link to="/dashboard" className="btn-lime text-sm px-8 py-3.5">Go to Dashboard →</Link>
              ) : (
                <Link to="/signup" className="btn-lime text-sm px-8 py-3.5">Start for free →</Link>
              )}
              <a href="#how-it-works" className="btn-ghost text-sm px-8 py-3.5">See how it works</a>
            </div>
          </div>

          {/* Product preview */}
          <div className="flex justify-center lg:justify-end animate-fade-up animate-delay-300">
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────
          Three columns separated by a rule, with an oversized outline numeral
          as the marker — a typographic device instead of the numbered-circle
          checklist pattern, and it reads as one glance instead of a scroll. */}
      <section id="how-it-works" className="py-20 px-6 max-w-6xl mx-auto border-t border-border">
        <p className="label-upper mb-10">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((s, i) => (
            <div key={s.title} className={i > 0 ? 'md:pl-8 md:border-l md:border-border' : ''}>
              <span
                className="block text-6xl font-bold leading-none mb-4 select-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--border)' }}
                aria-hidden="true"
              >
                0{i + 1}
              </span>
              <h3 className="display-sm text-ink mb-2">{s.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Closing CTA + footer, combined into one compact strip ───────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="display-md text-ink mb-1.5">
              {user ? 'Ready to continue?' : 'Ready when you are.'}
            </h2>
            <p className="text-muted text-sm">
              {user ? 'Head to your dashboard to manage your habits.' : 'Free forever — takes about 30 seconds to set up.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link to="/dashboard" className="btn-lime text-sm px-7 py-3">Dashboard →</Link>
            ) : (
              <>
                <Link to="/signup" className="btn-lime text-sm px-7 py-3">Create free account →</Link>
                <Link to="/login" className="btn-ghost text-sm px-7 py-3">Sign in</Link>
              </>
            )}
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <span className="text-sm font-bold text-ink" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>HabitLoop</span>
            <p className="text-xs text-muted">© 2024 HabitLoop</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
