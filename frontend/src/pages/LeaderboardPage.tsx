import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useLeaderboard, type LeaderboardPeriod, type LeaderboardEntry } from '../hooks/useLeaderboard';

// ─── Medal colours for top-3 ──────────────────────────────────────────────────
const MEDAL: Record<number, { emoji: string; bg: string; border: string; text: string }> = {
  1: { emoji: '🥇', bg: 'rgba(212,175,55,0.12)',   border: 'rgba(212,175,55,0.4)',  text: '#A87C1A' },
  2: { emoji: '🥈', bg: 'rgba(168,168,168,0.12)', border: 'rgba(168,168,168,0.4)', text: '#6B6B6B' },
  3: { emoji: '🥉', bg: 'rgba(176,99,40,0.12)',   border: 'rgba(176,99,40,0.4)',   text: '#8B4513' },
};

// ─── PeriodTab ────────────────────────────────────────────────────────────────
function PeriodTab({
  label, value, active, onClick,
}: { label: string; value: LeaderboardPeriod; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      id={`leaderboard-tab-${value}`}
      onClick={onClick}
      className={`px-5 py-2 rounded-pill text-sm font-semibold transition-all duration-200 ${
        active
          ? 'bg-ink text-white shadow-sm'
          : 'bg-transparent text-muted hover:text-ink border border-border hover:border-ink'
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
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl animate-pulse">
      <div className="w-8 h-5 bg-border rounded" />
      <div className="w-9 h-9 rounded-full bg-border shrink-0" />
      <div className="flex-1 h-4 bg-border rounded w-1/3" />
      <div className="w-16 h-4 bg-border rounded" />
    </div>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────
function EntryRow({
  entry, isMe,
}: { entry: LeaderboardEntry; isMe: boolean }): JSX.Element {
  const medal = MEDAL[entry.rank];

  return (
    <div
      id={`leaderboard-entry-${entry.rank}`}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-150 ${
        isMe
          ? 'bg-lime/10 border border-lime/30'
          : entry.rank <= 3
          ? 'hover:bg-canvas'
          : 'hover:bg-canvas/60'
      }`}
      style={medal ? { backgroundColor: medal.bg, border: `1px solid ${medal.border}` } : undefined}
    >
      {/* Rank */}
      <div
        className="w-8 text-center font-bold shrink-0"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.8rem',
          color: medal ? medal.text : isMe ? 'var(--purple)' : 'var(--muted)',
        }}
      >
        {medal ? medal.emoji : `#${entry.rank}`}
      </div>

      {/* Avatar */}
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.username}
          className="w-9 h-9 rounded-full object-cover ring-2 ring-border shrink-0"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: `hsl(${(entry.username.charCodeAt(0) * 37) % 360}, 60%, 88%)`,
            color: `hsl(${(entry.username.charCodeAt(0) * 37) % 360}, 50%, 30%)`,
          }}
        >
          {entry.username.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Username + "You" badge */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold text-ink truncate"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {entry.username}
          {isMe && (
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--lime)',
                color: 'var(--ink)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              YOU
            </span>
          )}
        </p>
      </div>

      {/* Score */}
      <div
        className="text-sm font-bold shrink-0 tabular-nums"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: medal ? medal.text : isMe ? 'var(--purple)' : 'var(--ink)',
        }}
      >
        {entry.score.toLocaleString()}
        <span className="text-xs font-normal text-muted ml-1">pts</span>
      </div>
    </div>
  );
}

// ─── MyRankBanner ─────────────────────────────────────────────────────────────
function MyRankBanner({
  rank, score, period,
}: { rank: number; score: number; period: LeaderboardPeriod }): JSX.Element {
  const periodLabel = period === 'weekly' ? 'this week' : period === 'monthly' ? 'this month' : 'all time';

  return (
    <div
      className="rounded-2xl p-4 flex items-center gap-5"
      style={{
        background: 'linear-gradient(135deg, var(--purple) 0%, var(--sky) 100%)',
      }}
    >
      <div className="text-center">
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Your rank</p>
        <p
          className="text-white font-bold leading-none mt-1"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem' }}
        >
          #{rank}
        </p>
      </div>
      <div className="w-px h-10 bg-white/20" />
      <div>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Score {periodLabel}</p>
        <p
          className="text-white font-bold leading-none mt-1"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.4rem' }}
        >
          {score.toLocaleString()} pts
        </p>
      </div>
    </div>
  );
}

// ─── LeaderboardPage ──────────────────────────────────────────────────────────
export default function LeaderboardPage(): JSX.Element {
  const { user } = useAuth();
  const { entries, myRank, loading, error, period, setPeriod } = useLeaderboard();

  const PERIODS: Array<{ value: LeaderboardPeriod; label: string }> = [
    { value: 'weekly',  label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'alltime', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--canvas)' }}>
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 px-6 py-4 border-b border-border flex items-center justify-between"
        style={{ backgroundColor: 'var(--canvas)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <div className="w-px h-5 bg-border" />
          <div>
            <p className="label-upper mb-0.5">HabitLoop</p>
            <h1 className="display-sm text-ink leading-none">Leaderboard</h1>
          </div>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <PeriodTab
              key={p.value}
              label={p.label}
              value={p.value}
              active={period === p.value}
              onClick={() => setPeriod(p.value)}
            />
          ))}
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Personal rank banner */}
        {myRank && (
          <div className="animate-fade-up">
            <MyRankBanner rank={myRank.rank} score={myRank.score} period={period} />
          </div>
        )}

        {/* Not yet on board hint */}
        {!myRank && !loading && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(108,92,231,0.08)', color: 'var(--purple)' }}
          >
            Complete your first habit check-in to appear on the leaderboard!
          </div>
        )}

        {/* Scoring legend */}
        <div
          className="rounded-xl px-5 py-3 flex items-center gap-6 text-xs"
          style={{ background: 'rgba(212,255,79,0.08)', border: '1px solid rgba(212,255,79,0.25)' }}
        >
          <span className="font-semibold text-ink" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            How scoring works:
          </span>
          <span className="text-muted">✅ Check-in <strong className="text-ink">+10 pts</strong></span>
          <span className="text-muted">🔥 7-day streak <strong className="text-ink">+50 pts</strong></span>
          <span className="text-muted">⚡ 30-day streak <strong className="text-ink">+200 pts</strong></span>
        </div>

        {/* ── Board ────────────────────────────────────────────────────────── */}
        <div
          className="card overflow-hidden"
          style={{ padding: 0 }}
        >
          {/* Board header */}
          <div
            className="flex items-center gap-4 px-4 py-3 border-b border-border"
            style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
          >
            <div className="w-8 text-center label-upper text-xs">#</div>
            <div className="w-9 shrink-0" />
            <div className="flex-1 label-upper text-xs">Player</div>
            <div className="label-upper text-xs">Score</div>
          </div>

          {/* Entries */}
          <div className="px-2 py-2 flex flex-col gap-0.5">
            {error && (
              <p className="text-sm text-red-500 px-4 py-3 text-center">{error}</p>
            )}

            {loading ? (
              Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            ) : entries.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted">No scores yet for this period.</p>
                <p className="text-xs text-muted mt-1">Be the first — go check in a habit!</p>
              </div>
            ) : (
              entries.map((entry) => (
                <EntryRow
                  key={entry.userId}
                  entry={entry}
                  isMe={entry.userId === user?.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Live indicator */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <span
              className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"
            />
            Live — updates when friends check in
          </div>
        )}
      </main>
    </div>
  );
}
