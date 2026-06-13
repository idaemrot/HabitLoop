import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  HabitChecklistMockup,
  StreakProgressMockup,
  StatsMockup,
  ReminderMockup,
} from '../components/UIMockups';

// ─── Landing / Home Page ──────────────────────────────────────────────────────
export default function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        {/* Eyebrow badge */}
        <div className="flex justify-center mb-6 animate-fade-up">
          <span className="badge-lime">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-dark inline-block" />
            Now in beta — free forever
          </span>
        </div>

        {/* Headline */}
        <h1
          className="display-xl text-center text-ink mb-6 animate-fade-up animate-delay-100"
          style={{ maxWidth: '800px', margin: '0 auto 1.5rem' }}
        >
          Build habits that{' '}
          <span className="relative inline-block">
            <span className="text-gradient">actually stick.</span>
          </span>
        </h1>

        {/* Sub */}
        <p
          className="text-center text-muted text-lg animate-fade-up animate-delay-200"
          style={{ maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: '1.7' }}
        >
          HabitLoop turns your intentions into streaks. Track, analyze, and repeat — every single day.
        </p>

        {/* CTA row */}
        <div className="flex items-center justify-center gap-4 animate-fade-up animate-delay-300">
          <Link to="/signup" className="btn-lime text-sm px-8 py-3.5">
            Start for free →
          </Link>
          <Link to="/#how-it-works" className="btn-ghost text-sm px-8 py-3.5">
            See how it works
          </Link>
        </div>

        {/* Social proof */}
        <p className="text-center text-xs text-muted mt-5 animate-fade-up animate-delay-400">
          Trusted by <strong className="text-ink">2,400+</strong> builders, athletes, and makers
        </p>
      </section>

      {/* ── Hero Card Grid ────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Card 1 — Today's habits (accent gradient) */}
          <div className="card-accent p-8 flex flex-col gap-6 animate-fade-up animate-delay-100" style={{ minHeight: '340px' }}>
            <div className="z-10 relative">
              <span className="badge-dark mb-3">Daily view</span>
              <h3 className="display-sm text-white mt-2">Check in on your habits</h3>
              <p className="text-white/60 text-sm mt-2">
                A beautiful checklist for every day. Never lose your streak.
              </p>
            </div>
            <div className="flex-1 flex items-end relative z-10">
              <HabitChecklistMockup />
            </div>
          </div>

          {/* Card 2 — Progress (white card) */}
          <div className="card p-8 flex flex-col gap-6 animate-fade-up animate-delay-200" style={{ minHeight: '340px' }}>
            <div>
              <span className="badge-lime mb-3">Analytics</span>
              <h3 className="display-sm text-ink mt-2">See your weekly progress</h3>
              <p className="text-muted text-sm mt-2">
                Visual breakdowns of completion rate, streaks, and personal bests.
              </p>
            </div>
            <div className="flex-1 flex items-end">
              <StreakProgressMockup />
            </div>
          </div>

          {/* Card 3 — Streak stats (accent gradient) */}
          <div className="card-accent p-8 flex flex-col gap-6 animate-fade-up animate-delay-300" style={{ minHeight: '340px' }}>
            <div className="z-10 relative">
              <span className="badge-dark mb-3">Streaks</span>
              <h3 className="display-sm text-white mt-2">Your longest streak ever</h3>
              <p className="text-white/60 text-sm mt-2">
                Keep the fire burning. Every day counts.
              </p>
            </div>
            <div className="flex-1 flex items-end relative z-10">
              <StatsMockup />
            </div>
          </div>
        </div>
      </section>

      <hr className="divider max-w-6xl mx-auto" />

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <p className="label-upper mb-3">Process</p>
          <h2 className="display-lg text-ink">Three steps to better habits</h2>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: 1,
              title: 'Define your habits',
              body: 'Choose what you want to build. Add a name, frequency, and optional reminder. Takes 30 seconds.',
              icon: '✏️',
            },
            {
              step: 2,
              title: 'Check in daily',
              body: 'One tap to log completion. HabitLoop calculates your streak automatically every night.',
              icon: '✅',
            },
            {
              step: 3,
              title: 'Review and grow',
              body: 'Weekly digest with your wins, longest streaks, and personalized suggestions.',
              icon: '📈',
            },
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

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <p className="label-upper mb-3">Features</p>
          <h2 className="display-lg text-ink">Everything you need. Nothing you don't.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Feature row 1 — wide left */}
          <div className="card-accent p-8 flex flex-col md:flex-row gap-6 items-center md:col-span-1">
            <div className="z-10 relative flex-1">
              <span className="badge-dark mb-3">Smart reminders</span>
              <h3 className="display-sm text-white mt-2 mb-2">Never miss a day</h3>
              <p className="text-white/60 text-sm">
                Push notifications, email digests, or SMS — choose what works for you.
              </p>
            </div>
            <div className="flex-1 z-10 relative">
              <ReminderMockup />
            </div>
          </div>

          {/* Feature — right */}
          <div className="card p-8 flex flex-col gap-4">
            <span className="badge-lime">Real-time sync</span>
            <h3 className="display-sm text-ink">Across all your devices</h3>
            <p className="text-muted text-sm leading-relaxed">
              Open your phone on the bus, finish on your laptop at home. Socket.IO keeps everything in sync instantly.
            </p>
            <div className="mt-auto">
              <div className="flex gap-2">
                {['📱', '💻', '⌚'].map((d, i) => (
                  <div key={i} className="flex-1 rounded-xl p-3 bg-canvas border border-border text-center">
                    <span className="text-xl">{d}</span>
                    <p className="text-[10px] text-muted mt-1">{['Mobile','Desktop','Watch'][i]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature — left bottom */}
          <div className="card p-8 flex flex-col gap-4">
            <span className="badge-lime">Accountability</span>
            <h3 className="display-sm text-ink">Compete with friends</h3>
            <p className="text-muted text-sm leading-relaxed">
              Share habits with friends, see each other's streaks, and celebrate wins together.
            </p>
            {/* Mini leaderboard */}
            <div className="mt-auto space-y-2">
              {[
                { name: 'Alex K.',   streak: 47, you: true  },
                { name: 'Jordan M.', streak: 38, you: false },
                { name: 'Sam T.',    streak: 21, you: false },
              ].map((u, i) => (
                <div key={u.name} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-canvas border border-border">
                  <span className="text-xs text-muted w-4">{i + 1}</span>
                  <span className={`flex-1 text-sm font-medium ${u.you ? 'text-ink' : 'text-muted'}`}>
                    {u.name}{u.you && <span className="ml-1 text-xs text-purple">(you)</span>}
                  </span>
                  <span className="text-xs font-mono text-ink font-semibold">🔥 {u.streak}d</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature — right bottom (accent) */}
          <div className="card-accent p-8 flex flex-col gap-4">
            <div className="z-10 relative">
              <span className="badge-dark mb-3">Insights</span>
              <h3 className="display-sm text-white mt-2 mb-2">AI-powered suggestions</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                HabitLoop analyzes your patterns and tells you the best time to build new habits based on your history.
              </p>
              <div className="mt-6 flex gap-2 z-10 relative">
                <Link to="/signup" className="btn-lime text-xs px-5 py-2">
                  Try it free →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider max-w-6xl mx-auto" />

      {/* ── CTA section ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto text-center">
        <p className="label-upper mb-4">Get started</p>
        <h2 className="display-lg text-ink mb-4" style={{ maxWidth: '600px', margin: '0 auto 1rem' }}>
          Start your first streak today
        </h2>
        <p className="text-muted mb-10 max-w-md mx-auto">
          Free forever. No credit card. Works on every device.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/signup" className="btn-lime text-sm px-10 py-3.5">
            Create free account →
          </Link>
          <Link to="/login" className="btn-dark text-sm px-10 py-3.5">
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔁</span>
            <span className="display-sm text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HabitLoop
            </span>
          </div>
          <p className="text-xs text-muted">© 2024 HabitLoop. Built with ❤️ and consistent habits.</p>
          <div className="flex gap-4">
            {['Privacy', 'Terms', 'Support'].map((l) => (
              <a key={l} href="#" className="text-xs text-muted hover:text-ink transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
