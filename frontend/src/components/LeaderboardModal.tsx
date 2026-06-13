import { useEffect } from 'react';
import { useAuth } from '../store/authContext';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardEntry } from '../hooks/useLeaderboard';

// ─── Medal colours ────────────────────────────────────────────────────────────
const MEDAL: Record<number, { emoji: string; bg: string; border: string; text: string }> = {
  1: { emoji: '🥇', bg: 'rgba(212,175,55,0.12)',  border: 'rgba(212,175,55,0.4)',  text: '#A87C1A' },
  2: { emoji: '🥈', bg: 'rgba(168,168,168,0.12)', border: 'rgba(168,168,168,0.4)', text: '#6B6B6B' },
  3: { emoji: '🥉', bg: 'rgba(176,99,40,0.12)',   border: 'rgba(176,99,40,0.4)',   text: '#8B4513' },
};

// ─── PeriodTab ────────────────────────────────────────────────────────────────
function PeriodTab({ label, value, active, onClick }: {
  label: string; value: LeaderboardPeriod; active: boolean; onClick: () => void;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-pill text-xs font-semibold transition-all duration-200 ${
        active ? 'bg-ink text-white' : 'text-muted hover:text-ink border border-border hover:border-ink'
      }`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {label}
    </button>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
function SkeletonRow(): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse">
      <div className="w-6 h-4 bg-border rounded" />
      <div className="w-8 h-8 rounded-full bg-border shrink-0" />
      <div className="flex-1 h-3.5 bg-border rounded w-1/3" />
      <div className="w-12 h-3.5 bg-border rounded" />
    </div>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }): JSX.Element {
  const medal = MEDAL[entry.rank];
  const hue   = (entry.username.charCodeAt(0) * 37) % 360;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
        isMe ? 'bg-lime/10 border border-lime/30' : 'hover:bg-canvas/60'
      }`}
      style={medal ? { backgroundColor: medal.bg, border: `1px solid ${medal.border}` } : undefined}
    >
      {/* Rank */}
      <div
        className="w-6 text-center font-bold shrink-0 text-xs"
        style={{ color: medal ? medal.text : isMe ? 'var(--purple)' : 'var(--muted)', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {medal ? medal.emoji : `#${entry.rank}`}
      </div>

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.username} className="w-8 h-8 rounded-full object-cover ring-2 ring-border shrink-0" />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},50%,30%)` }}
        >
          {entry.username.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Username */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <p className="text-sm font-semibold text-ink truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {entry.username}
        </p>
        {isMe && (
          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--lime)', color: 'var(--ink)', fontWeight: 700 }}>
            YOU
          </span>
        )}
      </div>

      {/* Score */}
      <div
        className="text-xs font-bold shrink-0 tabular-nums"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: medal ? medal.text : isMe ? 'var(--purple)' : 'var(--ink)' }}
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
        className="absolute right-0 top-full mt-2 z-50 w-[400px] bg-surface rounded-2xl shadow-panel border border-border flex flex-col animate-fade-up"
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
            <button onClick={onClose} className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-muted hover:bg-canvas hover:text-ink transition-all text-xs">
              ✕
            </button>
          </div>
        </div>

        {/* My rank banner */}
        {myRank && (
          <div
            className="mx-4 mt-3 rounded-xl px-4 py-2.5 flex items-center gap-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--purple) 0%, var(--sky) 100%)' }}
          >
            <div className="text-center">
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Your rank</p>
              <p className="text-white font-bold text-xl leading-none mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                #{myRank.rank}
              </p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Score</p>
              <p className="text-white font-bold text-base leading-none mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {myRank.score.toLocaleString()} pts
              </p>
            </div>
          </div>
        )}

        {!myRank && !loading && (
          <div className="mx-4 mt-3 rounded-xl px-4 py-2.5 text-xs text-center shrink-0" style={{ background: 'rgba(108,92,231,0.08)', color: 'var(--purple)' }}>
            Complete a habit check-in to appear on the leaderboard!
          </div>
        )}

        {/* Board header */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-1 shrink-0">
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
