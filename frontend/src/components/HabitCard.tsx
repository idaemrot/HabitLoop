import { useState, useRef } from 'react';
import type { Habit } from '../types';
import { HabitIcon } from './HabitIcon';

// ─── Small line icons (no icon library — kept dependency-free) ────────────────
function EditIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function ArchiveIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 13h4" />
    </svg>
  );
}
function TrashIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function CheckIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Spinner({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── HabitCard ────────────────────────────────────────────────────────────────
interface HabitCardProps {
  habit:         Habit;
  // Today's date (YYYY-MM-DD) in the user's own timezone — computed once by
  // the parent (see DashboardPage) so it agrees with how the backend decides
  // "today" for this user, rather than each card guessing from browser UTC.
  today:         string;
  onEdit:        (habit: Habit) => void;
  onDelete:      (id: string) => Promise<void>;
  onArchive:     (id: string, archived: boolean) => Promise<void>;
  onCheckIn:     (id: string) => Promise<void>;
  onUndoCheckIn: (id: string) => Promise<void>;
  // Called by this card when a delete API request fails.
  // The parent (Dashboard) owns the error display — keeps card stateless.
  onError:       (message: string) => void;
}

export default function HabitCard({
  habit,
  today,
  onEdit,
  onDelete,
  onArchive,
  onCheckIn,
  onUndoCheckIn,
  onError,
}: HabitCardProps): JSX.Element {
  const streak      = habit.streak;
  const current     = streak?.currentStreak ?? 0;
  const longest     = streak?.longestStreak ?? 0;
  const lastCheckIn = streak?.lastCheckIn;

  // Check if checked in today (compare YYYY-MM-DD prefix of ISO string)
  const checkedToday = lastCheckIn
    ? (typeof lastCheckIn === 'string' ? lastCheckIn : (lastCheckIn as Date).toISOString()).startsWith(today)
    : false;

  // Local loading state for check-in button — keeps card independent
  const [isChecking, setIsChecking] = useState(false);
  const isCheckingRef = useRef(false);

  const handleCheckIn = async (): Promise<void> => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    try {
      if (checkedToday) {
        await onUndoCheckIn(habit.id);
      } else {
        await onCheckIn(habit.id);
      }
    } catch (err: unknown) {
      const code = (err as { response?: { status?: number } })?.response?.status;
      const msg  = code === 409
        ? `Already checked in for today!`
        : checkedToday
          ? `Failed to undo check-in. Please try again.`
          : `Failed to check in. Please try again.`;
      onError(msg);
    } finally {
      setIsChecking(false);
      isCheckingRef.current = false;
    }
  };

  const streakLabel = current > 0
    ? `🔥 ${current} day${current === 1 ? '' : 's'}${longest > current ? ` · best ${longest}` : ''}`
    : longest > 0
      ? `Best ${longest} day${longest === 1 ? '' : 's'}`
      : 'No streak yet';

  return (
    <div
      className={`card flex items-center gap-3.5 pl-3.5 pr-3 py-3 transition-opacity duration-200 ${
        habit.isArchived ? 'opacity-55' : ''
      }`}
      style={{ borderLeft: `3px solid ${habit.color}` }}
    >
      {/* Icon badge — the habit's color identity, contained rather than flooding the row */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-ink transition-opacity duration-200"
        style={{ backgroundColor: habit.color, opacity: checkedToday ? 0.65 : 1 }}
      >
        <HabitIcon icon={habit.icon} width={18} height={18} />
      </div>

      {/* Title + meta — the primary content, not a stat grid */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={`text-sm font-semibold leading-snug truncate transition-colors duration-200 ${
              checkedToday ? 'text-muted' : 'text-ink'
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            title={habit.title}
          >
            {habit.title}
          </h3>
          {habit.isArchived && (
            <span className="badge-dark text-[10px] px-2 py-0.5 shrink-0">Archived</span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">
          {habit.frequency.charAt(0) + habit.frequency.slice(1).toLowerCase()} · {streakLabel}
        </p>
      </div>

      {/* Utility actions — compact icon buttons, not permanent text rows */}
      {!habit.isArchived && (
        <button
          onClick={() => onEdit(habit)}
          className="btn-icon"
          title="Edit habit"
          aria-label={`Edit ${habit.title}`}
        >
          <EditIcon />
        </button>
      )}
      <button
        onClick={() => void onArchive(habit.id, !habit.isArchived)}
        className="btn-icon"
        title={habit.isArchived ? 'Unarchive habit' : 'Archive habit'}
        aria-label={habit.isArchived ? `Unarchive ${habit.title}` : `Archive ${habit.title}`}
      >
        <ArchiveIcon />
      </button>
      <button
        onClick={() => {
          if (confirm(`Delete "${habit.title}"? This cannot be undone.`)) {
            onDelete(habit.id).catch(() => {
              onError(`Failed to delete "${habit.title}". Please try again.`);
            });
          }
        }}
        className="btn-icon hover:text-red-600"
        title="Delete habit"
        aria-label={`Delete ${habit.title}`}
      >
        <TrashIcon />
      </button>

      {/* Check-in control — the single most important interaction on this row */}
      {!habit.isArchived && (
        <button
          id={`checkin-${habit.id}`}
          onClick={() => void handleCheckIn()}
          disabled={isChecking}
          aria-pressed={checkedToday}
          className={`group relative w-10 h-10 rounded-full flex items-center justify-center shrink-0
                     border-2 transition-all duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2
                     ${
                       checkedToday
                         ? 'bg-lime border-lime text-ink hover:bg-red-50 hover:border-red-300 hover:text-red-500'
                         : 'bg-transparent border-border text-transparent hover:border-ink'
                     }`}
          title={checkedToday ? "Click to undo today's check-in" : 'Mark as done for today'}
        >
          {isChecking ? (
            <span className="text-ink">
              <Spinner />
            </span>
          ) : checkedToday ? (
            <>
              <span className="group-hover:hidden"><CheckIcon /></span>
              <span className="hidden group-hover:inline text-xs font-bold leading-none">✕</span>
            </>
          ) : null}
        </button>
      )}
    </div>
  );
}
