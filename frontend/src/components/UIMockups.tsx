// ─── Dark Panel Mockup Components ─────────────────────────────────────────────
// These simulate the "floating UI overlay" look on accent-gradient cards.

// Habit checklist mockup
export function HabitChecklistMockup(): JSX.Element {
  const habits = [
    { label: 'Morning meditation', done: true,  streak: 14 },
    { label: 'Read 30 min',        done: true,  streak: 7  },
    { label: 'Evening run',        done: false, streak: 3  },
    { label: 'Cold shower',        done: false, streak: 0  },
  ];

  return (
    <div className="panel-dark w-full max-w-xs">
      <p className="label-upper text-white/40 mb-3">Today's habits</p>
      <ul className="space-y-2">
        {habits.map((h) => (
          <li key={h.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                  h.done
                    ? 'bg-lime border-lime text-ink'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {h.done && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className={`text-xs font-medium ${h.done ? 'text-white/50 line-through' : 'text-white'}`}>
                {h.label}
              </span>
            </div>
            <span className="text-xs font-mono text-white/30">
              {h.streak > 0 ? `🔥 ${h.streak}d` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Streak progress bar mockup
export function StreakProgressMockup(): JSX.Element {
  const habits = [
    { label: 'Meditation', pct: 93, color: '#D4FF4F' },
    { label: 'Reading',    pct: 71, color: '#74C0FC' },
    { label: 'Exercise',   pct: 54, color: '#6C5CE7' },
  ];

  return (
    <div className="panel-dark w-full max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <p className="label-upper text-white/40">Weekly progress</p>
        <span className="badge-dark text-[10px]">This week</span>
      </div>
      <div className="space-y-3">
        {habits.map((h) => (
          <div key={h.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/70">{h.label}</span>
              <span className="text-xs font-mono font-medium" style={{ color: h.color }}>
                {h.pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${h.pct}%`, backgroundColor: h.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Toggle stats mockup
export function StatsMockup(): JSX.Element {
  return (
    <div className="panel-dark w-full max-w-xs">
      <p className="label-upper text-white/40 mb-3">Your streak</p>
      <div className="flex items-end gap-4 mb-4">
        <div>
          <p className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            47
          </p>
          <p className="text-xs text-white/40 mt-0.5">day streak 🔥</p>
        </div>
        <div className="flex-1 flex gap-1 items-end pb-1">
          {[3,5,4,7,6,5,7].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{
              height: `${h * 6}px`,
              backgroundColor: i === 6 ? '#D4FF4F' : 'rgba(255,255,255,0.15)'
            }} />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl p-2.5 bg-white/5">
          <p className="text-[10px] text-white/40">Best</p>
          <p className="text-sm font-semibold text-white">52 days</p>
        </div>
        <div className="flex-1 rounded-xl p-2.5 bg-white/5">
          <p className="text-[10px] text-white/40">Total</p>
          <p className="text-sm font-semibold text-white">183 days</p>
        </div>
        <div className="flex-1 rounded-xl p-2.5" style={{ backgroundColor: 'rgba(212,255,79,0.15)' }}>
          <p className="text-[10px] text-lime/70">Score</p>
          <p className="text-sm font-semibold text-lime">94%</p>
        </div>
      </div>
    </div>
  );
}

// Reminder toggle mockup
export function ReminderMockup(): JSX.Element {
  const reminders = [
    { label: 'Morning reminder', time: '7:00 AM', on: true  },
    { label: 'Evening check-in', time: '9:00 PM', on: true  },
    { label: 'Weekly review',    time: 'Sunday',  on: false },
  ];

  return (
    <div className="panel-dark w-full max-w-xs">
      <p className="label-upper text-white/40 mb-3">Reminders</p>
      <div className="space-y-2.5">
        {reminders.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">{r.label}</p>
              <p className="text-[10px] text-white/40">{r.time}</p>
            </div>
            {/* Toggle */}
            <div
              className={`w-9 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-200 ${
                r.on ? 'bg-lime justify-end' : 'bg-white/10 justify-start'
              }`}
            >
              <div className={`w-4 h-4 rounded-full ${r.on ? 'bg-ink' : 'bg-white/30'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
