import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  HabitChecklistMockup,
  StreakProgressMockup,
  StatsMockup,
} from '../components/UIMockups';

// ─── Marketing Landing Page ───────────────────────────────────────────────────
export default function LandingPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="flex justify-start mb-6 animate-fade-up">
          <span className="badge-lime">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-dark inline-block" />
            Now in beta — free forever
          </span>
        </div>
        <h1 className="display-xl text-left text-ink mb-6 animate-fade-up animate-delay-100 max-w-2xl">
          Build habits that{' '}
          <span className="relative inline-block mt-2">
            <span className="bg-lime px-4 py-1 rounded-xl border border-border shadow-sm inline-block -rotate-1">actually stick.</span>
          </span>
        </h1>
        <p className="text-left text-muted text-lg animate-fade-up animate-delay-200 max-w-lg mb-10 leading-relaxed">
          HabitLoop turns your intentions into streaks. Track, analyze, and repeat — every single day.
        </p>
        <div className="flex items-center justify-start gap-4 animate-fade-up animate-delay-300">
          <Link to="/signup" className="btn-lime text-sm px-8 py-3.5">Start for free →</Link>
          <a href="#how-it-works" className="btn-ghost text-sm px-8 py-3.5">See how it works</a>
        </div>
        <p className="text-left text-xs text-muted mt-6 animate-fade-up animate-delay-400">
          Trusted by <strong className="text-ink">2,400+</strong> builders, athletes, and makers
        </p>
      </section>

      {/* ── Feature Cards ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4 animate-fade-up animate-delay-100">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex-1 min-h-[220px] flex items-center justify-center relative overflow-hidden group">
              <div className="w-full max-w-[200px] space-y-3">
                {[
                  { name: 'Morning run', color: '#D4FF4F', checked: true },
                  { name: 'Read 10 pages', color: '#74C0FC', checked: false },
                  { name: 'Meditate', color: '#6C5CE7', checked: false },
                ].map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl border border-border/50 bg-canvas/30">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${h.checked ? 'bg-ink border-ink' : 'border-border bg-white'}`}>
                      {h.checked && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className={`text-sm ${h.checked ? 'text-muted line-through' : 'text-ink font-medium'}`}>{h.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="badge-dark mb-2">Daily view</span>
              <h3 className="display-sm text-ink mt-1">Check in on your habits</h3>
              <p className="text-muted text-sm mt-1">A beautiful checklist for every day.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 animate-fade-up animate-delay-200 mt-0 md:mt-12">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex-1 min-h-[220px] flex flex-col items-center justify-end relative overflow-hidden group">
              <div className="flex items-end gap-2 h-32 w-full justify-center opacity-80">
                {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                  <div key={i} className="w-6 bg-lime border border-border rounded-t-md" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex gap-2 w-full justify-center mt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} className="w-6 text-center text-[10px] text-muted font-medium">{d}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="badge-lime mb-2">Analytics</span>
              <h3 className="display-sm text-ink mt-1">See your weekly progress</h3>
              <p className="text-muted text-sm mt-1">Visual breakdowns of streaks and completion rate.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 animate-fade-up animate-delay-300 mt-0 md:mt-24">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm flex-1 min-h-[220px] flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="text-center">
                <span className="text-4xl block mb-2">🔥</span>
                <span className="display-sm text-ink block">14 days</span>
                <span className="text-xs text-muted uppercase tracking-wider font-semibold">Current Streak</span>
              </div>
            </div>
            <div>
              <span className="badge-dark mb-2">Streaks</span>
              <h3 className="display-sm text-ink mt-1">Your longest streak ever</h3>
              <p className="text-muted text-sm mt-1">Every day counts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 max-w-3xl mx-auto">
        <div className="mb-16 text-left">
          <p className="label-upper mb-3">Process</p>
          <h2 className="display-lg text-ink">Three steps to better habits</h2>
        </div>
        <div className="flex flex-col gap-12">
          {[
            { step: 1, title: 'Define your habits', body: 'Add a name, frequency, and icon. Takes 30 seconds.' },
            { step: 2, title: 'Check in daily', body: 'One tap to log completion. Streaks calculated automatically.' },
            { step: 3, title: 'Review and grow', body: 'Weekly digest with your wins, streaks, and suggestions.' },
          ].map((s) => (
            <div key={s.step} className="flex gap-6 items-start">
              <span className={`step-pill flex-shrink-0 mt-1 ${s.step === 1 ? 'active' : ''}`}>{s.step}</span>
              <div>
                <h3 className="display-sm text-ink mb-2">{s.title}</h3>
                <p className="text-muted text-lg leading-relaxed max-w-xl">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider max-w-6xl mx-auto my-12" />



      {/* ── Why I built this ─────────────────────────────────────────────────
      <section className="py-24 px-6 max-w-3xl mx-auto text-left">
        <div className="bg-white rounded-3xl p-10 md:p-14 border border-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-lime" />
          <h3 className="display-sm text-ink mb-6">Why I built this</h3>
          <p className="text-muted text-lg leading-relaxed mb-8 italic">
            "I tried every habit tracker out there. They were either too bloated with features I didn't need, or too simple to actually motivate me. I just wanted something fast, beautiful, and reliable that synced instantly across my devices. So I built HabitLoop."
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-canvas border border-border flex items-center justify-center text-muted font-bold">M</div>
            <div>
              <p className="font-bold text-ink text-sm">Maker</p>
              <p className="text-xs text-muted">Building HabitLoop</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 max-w-6xl mx-auto text-center">
        <p className="label-upper mb-4">Get started</p>
        <h2 className="display-lg text-ink mb-4" style={{ maxWidth: '600px', margin: '0 auto 1rem' }}>
          Start your first streak today
        </h2>
        <p className="text-muted mb-10 max-w-md mx-auto text-lg">Free forever. No credit card. Works on every device.</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/signup" className="btn-lime text-sm px-10 py-4">Create free account →</Link>
          <Link to="/login" className="btn-ghost text-sm px-10 py-4">Sign in</Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="display-sm text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>HabitLoop</span>
          </div>
          <p className="text-xs text-muted">© 2024 HabitLoop. Built with consistent habits.</p>
        </div>
      </footer>
    </div>
  );
}
