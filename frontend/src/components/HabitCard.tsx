import type { Habit } from '../types';

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, string> = {
  flame:    '🔥', book:    '📖', run:    '🏃', meditate: '🧘',
  water:    '💧', barbell: '💪', pen:    '✍️', star:     '⭐',
  moon:     '🌙', apple:   '🍎', music:  '🎵', code:     '💻',
};

function getIcon(icon: string): string {
  return ICON_MAP[icon] ?? '🔥';
}

// ─── Streak ring ──────────────────────────────────────────────────────────────
function StreakRing({ current, longest }: { current: number; longest: number }): JSX.Element {
  const pct     = longest > 0 ? Math.min((current / longest) * 100, 100) : 0;
  const radius  = 18;
  const circ    = 2 * Math.PI * radius;
  const dash    = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="absolute inset-0 -rotate-90" width="48" height="48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#E0E0E0" strokeWidth="3" />
        <circle
          cx="24" cy="24" r={radius} fill="none"
          stroke="#D4FF4F" strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="text-xs font-bold text-ink z-10">{current}</span>
    </div>
  );
}

// ─── HabitCard ────────────────────────────────────────────────────────────────
interface HabitCardProps {
  habit:     Habit;
  onEdit:    (habit: Habit) => void;
  onDelete:  (id: string) => Promise<void>;
  onArchive: (id: string, archived: boolean) => Promise<void>;
  // Called by this card when a delete API request fails.
  // The parent (Dashboard) owns the error display — keeps card stateless.
  onError:   (message: string) => void;
}

export default function HabitCard({
  habit,
  onEdit,
  onDelete,
  onArchive,
  onError,
}: HabitCardProps): JSX.Element {
  const streak      = habit.streak;
  const current     = streak?.currentStreak ?? 0;
  const longest     = streak?.longestStreak ?? 0;
  const lastCheckIn = streak?.lastCheckIn;

  // Check if checked in today
  const today         = new Date().toISOString().split('T')[0];
  const checkedToday  = lastCheckIn?.startsWith(today) ?? false;

  return (
    <div
      className={`card p-5 flex flex-col gap-4 transition-all duration-200 ${
        habit.isArchived ? 'opacity-50' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: habit.color }}
          >
            {getIcon(habit.icon)}
          </div>

          {/* Title + meta */}
          <div className="min-w-0">
            <h3 className="display-sm text-ink text-sm leading-snug truncate" title={habit.title}>
              {habit.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="badge-lime text-[10px] px-2 py-0.5">
                {habit.frequency.charAt(0) + habit.frequency.slice(1).toLowerCase()}
              </span>
              {habit.isArchived && (
                <span className="badge-dark text-[10px] px-2 py-0.5">Archived</span>
              )}
            </div>
          </div>
        </div>

        {/* Streak ring */}
        <StreakRing current={current} longest={longest} />
      </div>

      {/* Description */}
      {habit.description && (
        <p className="text-xs text-muted leading-relaxed line-clamp-2">
          {habit.description}
        </p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Current',  value: `${current}d` },
          { label: 'Best',     value: `${longest}d` },
          { label: 'Today',    value: checkedToday ? '✓' : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-canvas border border-border px-2 py-2 text-center">
            <p className="text-xs font-bold text-ink" style={{ color: s.label === 'Today' && checkedToday ? '#D4FF4F' : undefined }}>
              {s.value}
            </p>
            <p className="text-[10px] text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1 border-t border-border">
        <button
          onClick={() => onEdit(habit)}
          className="flex-1 text-xs font-medium text-muted hover:text-ink py-1.5 rounded-lg
                     hover:bg-canvas transition-all duration-150"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Edit
        </button>
        <button
          onClick={() => void onArchive(habit.id, !habit.isArchived)}
          className="flex-1 text-xs font-medium text-muted hover:text-ink py-1.5 rounded-lg
                     hover:bg-canvas transition-all duration-150"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {habit.isArchived ? 'Unarchive' : 'Archive'}
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${habit.title}"? This cannot be undone.`)) {
              onDelete(habit.id).catch(() => {
                onError(`Failed to delete "${habit.title}". Please try again.`);
              });
            }
          }}
          className="flex-1 text-xs font-medium text-red-500 hover:text-red-700 py-1.5 rounded-lg
                     hover:bg-red-50 transition-all duration-150"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
