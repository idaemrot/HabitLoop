import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  HabitChecklistMockup,
  StreakProgressMockup,
  StatsMockup,
  ReminderMockup,
} from '../components/UIMockups';

// ─── Marketing Landing Page ───────────────────────────────────────────────────
export default function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex justify-center mb-6 animate-fade-up">
          <span className="badge-lime">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-dark inline-block" />
            Now in beta — free forever
          </span>
        </div>
        <h1 className="display-xl text-center text-ink mb-6 animate-fade-up animate-delay-100"
            style={{ maxWidth: '800px', margin: '0 auto 1.5rem' }}>
          Build habits that{' '}
          <span className="relative inline-block">
            <span className="text-gradient">actually stick.</span>
          </span>
        </h1>
        <p className="text-center text-muted text-lg animate-fade-up animate-delay-200"
           style={{ maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: '1.7' }}>
          HabitLoop turns your intentions into streaks. Track, analyze, and repeat — every single day.
        </p>
        <div className="flex items-center justify-center gap-4 animate-fade-up animate-delay-300">
          <Link to="/signup" className="btn-lime text-sm px-8 py-3.5">Start for free →</Link>
          <Link to="/#how-it-works" className="btn-ghost text-sm px-8 py-3.5">See how it works</Link>
        </div>
        <p className="text-center text-xs text-muted mt-5 animate-fade-up animate-delay-400">
          Trusted by <strong className="text-ink">2,400+</strong> builders, athletes, and makers
        </p>
      </section>

      {/* ── Feature Cards ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card-accent p-8 flex flex-col gap-6 animate-fade-up animate-delay-100" style={{ minHeight: '340px' }}>
            <div className="z-10 relative">
              <span className="badge-dark mb-3">Daily view</span>
              <h3 className="display-sm text-white mt-2">Check in on your habits</h3>
              <p className="text-white/60 text-sm mt-2">A beautiful checklist for every day.</p>
            </div>
            <div className="flex-1 flex items-end relative z-10"><HabitChecklistMockup /></div>
          </div>
          <div className="card p-8 flex flex-col gap-6 animate-fade-up animate-delay-200" style={{ minHeight: '340px' }}>
            <div>
              <span className="badge-lime mb-3">Analytics</span>
              <h3 className="display-sm text-ink mt-2">See your weekly progress</h3>
              <p className="text-muted text-sm mt-2">Visual breakdowns of streaks and completion rate.</p>
            </div>
            <div className="flex-1 flex items-end"><StreakProgressMockup /></div>
          </div>
          <div className="card-accent p-8 flex flex-col gap-6 animate-fade-up animate-delay-300" style={{ minHeight: '340px' }}>
            <div className="z-10 relative">
              <span className="badge-dark mb-3">Streaks</span>
              <h3 className="display-sm text-white mt-2">Your longest streak ever</h3>
              <p className="text-white/60 text-sm mt-2">Every day counts.</p>
            </div>
            <div className="flex-1 flex items-end relative z-10"><StatsMockup /></div>
          </div>
        </div>
      </section>

      <hr className="divider max-w-6xl mx-auto" />

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <p className="label-upper mb-3">Process</p>
          <h2 className="display-lg text-ink">Three steps to better habits</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: 1, title: 'Define your habits',    body: 'Add a name, frequency, and reminder. Takes 30 seconds.',            icon: '✏️' },
            { step: 2, title: 'Check in daily',        body: 'One tap to log completion. Streaks calculated automatically.',       icon: '✅' },
            { step: 3, title: 'Review and grow',       body: 'Weekly digest with your wins, streaks, and suggestions.',           icon: '📈' },
          ].map((s) => (
            <div key={s.step} className="card p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className={`step-pill ${s.step === 1 ? 'active' : ''}`}>{s.step}</span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div>
                <h3 className="display-sm text-ink mb-2">{s.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider max-w-6xl mx-auto" />

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <p className="label-upper mb-3">Features</p>
          <h2 className="display-lg text-ink">Everything you need.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-accent p-8 flex flex-col md:flex-row gap-6 items-center">
            <div className="z-10 relative flex-1">
              <span className="badge-dark mb-3">Smart reminders</span>
              <h3 className="display-sm text-white mt-2 mb-2">Never miss a day</h3>
              <p className="text-white/60 text-sm">Push notifications, email digests — your choice.</p>
            </div>
            <div className="flex-1 z-10 relative"><ReminderMockup /></div>
          </div>
          <div className="card p-8 flex flex-col gap-4">
            <span className="badge-lime">Real-time sync</span>
            <h3 className="display-sm text-ink">Across all your devices</h3>
            <p className="text-muted text-sm leading-relaxed">Socket.IO keeps everything in sync instantly.</p>
            <div className="mt-auto flex gap-2">
              {(['📱 Mobile','💻 Desktop','⌚ Watch'] as const).map((d) => (
                <div key={d} className="flex-1 rounded-xl p-3 bg-canvas border border-border text-center text-xs text-muted">{d}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto text-center">
        <p className="label-upper mb-4">Get started</p>
        <h2 className="display-lg text-ink mb-4" style={{ maxWidth: '600px', margin: '0 auto 1rem' }}>
          Start your first streak today
        </h2>
        <p className="text-muted mb-10 max-w-md mx-auto">Free forever. No credit card. Works on every device.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/signup" className="btn-lime text-sm px-10 py-3.5">Create free account →</Link>
          <Link to="/login"  className="btn-dark text-sm px-10 py-3.5">Sign in</Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔁</span>
            <span className="display-sm text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>HabitLoop</span>
          </div>
          <p className="text-xs text-muted">© 2024 HabitLoop. Built with ❤️ and consistent habits.</p>
          <div className="flex gap-4">
            {['Privacy', 'Terms', 'Support'].map((l) => (
              <a key={l} href="#" className="text-xs text-muted hover:text-ink transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
