import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useHabits } from '../hooks/useHabits';
import HabitCard from '../components/HabitCard';
import HabitModal from '../components/HabitModal';
import FriendFeed from '../components/FriendFeed';
import FriendsModal from '../components/FriendsModal';
import LeaderboardModal from '../components/LeaderboardModal';
import Toast from '../components/Toast';
import { toLocalDateString } from '../lib/date';
import type { Habit } from '../types';

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 animate-float bg-canvas border border-border shadow-sm text-ink font-bold font-mono text-2xl"
      >
        H
      </div>
      <h3 className="display-md text-ink mb-2">No habits yet</h3>
      <p className="text-muted text-sm max-w-xs mb-8 leading-relaxed">
        Add your first habit and start building streaks that actually stick.
      </p>
      <button onClick={onAdd} className="btn-lime px-8 py-3">
        Add your first habit →
      </button>
    </div>
  );
}

// ─── Daily progress ───────────────────────────────────────────────────────────
// Replaces a 4-box KPI grid with a single slim line: a progress bar for
// "done today" (the number that actually matters day-to-day) plus two
// lightweight secondary numbers as plain text — no cards, no shadows.
function DailyProgress({ habits, today }: { habits: Habit[]; today: string }): JSX.Element {
  const total       = habits.length;
  const done        = habits.filter((h) => h.streak?.lastCheckIn?.startsWith(today)).length;
  const pct         = total > 0 ? Math.round((done / total) * 100) : 0;
  const totalStreak = habits.reduce((s, h) => s + (h.streak?.currentStreak ?? 0), 0);
  const best        = Math.max(0, ...habits.map((h) => h.streak?.longestStreak ?? 0));

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8 pb-6 border-b border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-ink">Today's progress</p>
          <p className="text-sm text-muted tabular-nums">{done}/{total}</p>
        </div>
        <div className="h-2 rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-lime transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div
        className="flex items-center gap-4 text-xs text-muted shrink-0"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span>🔥 {totalStreak}d total</span>
        <span className="w-px h-3 bg-border" aria-hidden="true" />
        <span>Best {best}d</span>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage(): JSX.Element {
  const { user, logout }  = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    checkIn,
    undoCheckIn,
  } = useHabits(showArchived);

  const [modalOpen,        setModalOpen]        = useState(false);
  const [editingHabit,     setEditingHabit]     = useState<Habit | null>(null);
  const [deleteError,      setDeleteError]      = useState<string | null>(null);
  const [friendsOpen,      setFriendsOpen]      = useState(false);
  const [leaderboardOpen,  setLeaderboardOpen]  = useState(false);

  // Stable callback — passed down to every HabitCard as onError
  const handleDeleteError = useCallback((msg: string) => setDeleteError(msg), []);

  const openCreate = (): void => { setEditingHabit(null); setModalOpen(true); };
  const openEdit   = (h: Habit): void => { setEditingHabit(h); setModalOpen(true); };
  const closeModal = (): void => { setModalOpen(false); setEditingHabit(null); };

  const activeHabits   = habits.filter((h) => !h.isArchived);
  const archivedHabits = habits.filter((h) =>  h.isArchived);

  // "Today" in the user's own configured timezone (falls back to the
  // browser's timezone only in the unlikely case `user` isn't loaded yet).
  // Computed once here so every "checked in today" comparison on this page
  // agrees with the backend, which always reasons in the user's timezone.
  const timezone = user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today    = toLocalDateString(new Date(), timezone);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: timezone,
  }).format(new Date());

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <Link to="/" className="flex items-center group w-fit">
          <span className="display-sm text-sm text-ink group-hover:text-purple transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            HabitLoop
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-muted hidden md:block mr-1">
            Hey, <strong className="text-ink">{user?.username}</strong>
          </span>
          <div className="relative">
            <button
              onClick={() => setFriendsOpen((v) => !v)}
              className={`btn-ghost text-xs px-4 py-2 ${friendsOpen ? 'bg-ink text-white border-ink' : ''}`}
            >
              Friends
            </button>
            {friendsOpen && <FriendsModal onClose={() => setFriendsOpen(false)} />}
          </div>
          <div className="relative">
            <button
              onClick={() => setLeaderboardOpen((v) => !v)}
              className={`btn-ghost text-xs px-4 py-2 ${leaderboardOpen ? 'bg-ink text-white border-ink' : ''}`}
            >
              Leaderboard
            </button>
            {leaderboardOpen && <LeaderboardModal onClose={() => setLeaderboardOpen(false)} />}
          </div>
          <button
            onClick={() => void logout()}
            className="btn-icon"
            title="Sign out"
            aria-label="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="pt-24 pb-16 px-6 md:px-12 w-full max-w-6xl mx-auto">
        {/* Compact header — date + heading, not a marketing banner */}
        <div className="flex items-end justify-between mb-6 gap-4">
          <div>
            <p className="text-xs text-muted mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formattedDate}
            </p>
            <h1 className="display-md text-ink">Your habits</h1>
          </div>
          <button onClick={openCreate} className="btn-lime text-sm px-5 py-2.5 shrink-0">
            + New habit
          </button>
        </div>

        {/* Daily progress — one slim line, not four KPI boxes */}
        {activeHabits.length > 0 && <DailyProgress habits={activeHabits} today={today} />}

        {/* Error state */}
        {error && <div className="banner-error mb-6">{error}</div>}

        {/* Two-column layout for Habits + Feed */}
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Main Column — Habits, as a list (rows), not an analytics card grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-16" />
                ))}
              </div>
            ) : habits.length === 0 ? (
              <EmptyState onAdd={openCreate} />
            ) : (
              <>
                {/* Active habits */}
                {activeHabits.length > 0 && (
                  <>
                    <p className="label-upper mb-3">Active · {activeHabits.length}</p>
                    <div className="flex flex-col gap-2 mb-8">
                      {activeHabits.map((h) => (
                        <div key={h.id} className="animate-fade-up">
                          <HabitCard
                            habit={h}
                            today={today}
                            onEdit={openEdit}
                            onDelete={deleteHabit}
                            onArchive={archiveHabit}
                            onCheckIn={checkIn}
                            onUndoCheckIn={undoCheckIn}
                            onError={handleDeleteError}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Archived section toggle */}
                {archivedHabits.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setShowArchived((v) => !v)}
                      className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors mb-3"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>{showArchived ? '▼' : '▶'}</span>
                      Archived · {archivedHabits.length}
                    </button>

                    {showArchived && (
                      <div className="flex flex-col gap-2">
                        {archivedHabits.map((h) => (
                          <HabitCard
                            key={h.id}
                            habit={h}
                            today={today}
                            onEdit={openEdit}
                            onDelete={deleteHabit}
                            onArchive={archiveHabit}
                            onCheckIn={checkIn}
                            onUndoCheckIn={undoCheckIn}
                            onError={handleDeleteError}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Column — Activity Feed */}
          <aside className="w-full lg:w-[320px] shrink-0">
            <FriendFeed />
          </aside>

        </div>
      </main>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <HabitModal
        open={modalOpen}
        habit={editingHabit}
        onClose={closeModal}
        onCreate={async (payload) => { await createHabit(payload); }}
        onUpdate={async (id, payload) => { await updateHabit(id, payload); }}
      />

      {/* ── Delete error toast ───────────────────────────────────── */}
      <Toast
        message={deleteError}
        onDismiss={() => setDeleteError(null)}
      />
    </div>
  );
}
