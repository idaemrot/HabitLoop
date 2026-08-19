import { useEffect } from 'react';
import { useAuth } from '../store/authContext';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardEntry } from '../hooks/useLeaderboard';

// ─── Medal glyphs — a rank marker, not a colored card ─────────────────────────
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ─── PeriodTab ────────────────────────────────────────────────────────────────
function PeriodTab({ label, value: _value, active, onClick }: {
  label: string; value: LeaderboardPeriod; active: boolean; onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-pill text-xs font-semibold font-display transition-colors duration-150 ${
        active ? 'bg-ink text-white' : 'text-muted hover:text-ink border border-border hover:border-ink'
      }`}
    >
      {label}
    </button>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
function SkeletonRow(): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="skeleton w-6 h-4" />
      <div className="skeleton w-8 h-8 rounded-full shrink-0" />
      <div className="skeleton flex-1 h-3.5 w-1/3" />
      <div className="skeleton w-12 h-3.5" />
    </div>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }): JSX.Element {
  const medal = MEDAL[entry.rank];
  const top3  = entry.rank <= 3;
  const hue   = (entry.username.charCodeAt(0) * 37) % 360;

  return (
    <div
      className={`flex items-center gap-3 px-3 rounded-lg transition-colors duration-150 ${top3 ? 'py-3' : 'py-2.5'} ${
        isMe ? 'bg-lime/10 border-l-2 border-lime' : 'border-l-2 border-transparent hover:bg-canvas/60'
      }`}
    >
      {/* Rank — top 3 get scale, not a colored card */}
      <div
        className={`text-center font-bold font-display shrink-0 text-muted ${top3 ? 'w-7 text-lg' : 'w-6 text-xs'}`}
      >
        {medal ?? `#${entry.rank}`}
      </div>

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.username} className={`rounded-full object-cover shrink-0 ${top3 ? 'w-9 h-9' : 'w-8 h-8'}`} />
      ) : (
        <div
          className={`rounded-full flex items-center justify-center font-bold shrink-0 ${top3 ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-xs'}`}
          style={{ background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},50%,30%)` }}
        >
          {entry.username.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Username */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <p
          className={`font-semibold font-display text-ink truncate ${top3 ? 'text-base' : 'text-sm'}`}
        >
          {entry.username}
        </p>
        {isMe && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-bold bg-lime text-ink">
            YOU
          </span>
        )}
      </div>

      {/* Score */}
      <div
        className={`font-bold font-mono shrink-0 tabular-nums text-ink ${top3 ? 'text-sm' : 'text-xs'}`}
      >
        {entry.score.toLocaleString()}
        <span className="font-normal text-muted ml-0.5">pts</span>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LeaderboardModalProps { onClose: () => void; }

// ─── LeaderboardModal ─────────────────────────────────────────────────────────
export default function LeaderboardModal({ onClose }: LeaderboardModalProps): JSX.Element {
  const { user } = useAuth();
  const { entries, myRank, loading, error, period, setPeriod } = useLeaderboard();

  const PERIODS: Array<{ value: LeaderboardPeriod; label: string }> = [
    { value: 'weekly',  label: 'Week'  },
    { value: 'monthly', label: 'Month' },
    { value: 'alltime', label: 'All'   },
  ];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Transparent backdrop — click-outside closes */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown panel */}
      <div
        className="absolute right-0 top-full mt-2 z-50 w-[400px] bg-surface rounded-xl shadow-panel border border-border flex flex-col animate-fade-up"
        style={{ maxHeight: '540px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div>
            <p className="label-upper">Rankings</p>
            <h2 className="display-sm text-ink mt-0.5">Leaderboard</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Period pills */}
            {PERIODS.map((p) => (
              <PeriodTab key={p.value} label={p.label} value={p.value} active={period === p.value} onClick={() => setPeriod(p.value)} />
            ))}
            <button onClick={onClose} className="btn-icon w-7 h-7 ml-1 text-xs" aria-label="Close leaderboard">
              ✕
            </button>
          </div>
        </div>

        {/* My rank — a plain inline stat, not a gradient banner */}
        {myRank && (
          <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-muted shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0" aria-hidden="true" />
            You're ranked
            <span className="font-bold font-display text-ink">#{myRank.rank}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold font-mono text-ink tabular-nums">
              {myRank.score.toLocaleString()} pts
            </span>
          </div>
        )}

        {!myRank && !loading && (
          <p className="mx-5 mt-3 text-xs text-muted shrink-0">
            Complete a habit check-in to appear on the leaderboard.
          </p>
        )}

        {/* Board header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-1 shrink-0">
          <div className="w-6 label-upper text-[10px]">#</div>
          <div className="w-8 shrink-0" />
          <div className="flex-1 label-upper text-[10px]">Player</div>
          <div className="label-upper text-[10px]">Score</div>
        </div>

        {/* Entries — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted">No scores yet for this period.</p>
              <p className="text-xs text-muted mt-1">Be the first — check in a habit!</p>
            </div>
          ) : (
            entries.map((entry) => (
              <EntryRow key={entry.userId} entry={entry} isMe={entry.userId === user?.id} />
            ))
          )}
        </div>

        {/* Live indicator */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted py-2.5 border-t border-border shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Live updates
          </div>
        )}
      </div>
    </>
  );
}
