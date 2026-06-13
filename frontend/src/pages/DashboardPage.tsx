import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useHabits } from '../hooks/useHabits';
import HabitCard from '../components/HabitCard';
import HabitModal from '../components/HabitModal';
import FriendFeed from '../components/FriendFeed';
import Toast from '../components/Toast';
import type { Habit } from '../types';

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6 animate-float"
        style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #74C0FC 100%)' }}
      >
        🔁
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

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ habits }: { habits: Habit[] }): JSX.Element {
  const total       = habits.length;
  const totalStreak = habits.reduce((s, h) => s + (h.streak?.currentStreak ?? 0), 0);
  const best        = Math.max(0, ...habits.map((h) => h.streak?.longestStreak ?? 0));
  const today       = new Date().toISOString().split('T')[0];
  const doneToday   = habits.filter((h) => h.streak?.lastCheckIn?.startsWith(today)).length;

  const stats = [
    { label: 'Habits',          value: total,       icon: '📋' },
    { label: 'Total streak',    value: `${totalStreak}d`, icon: '🔥' },
    { label: 'Best streak',     value: `${best}d`,   icon: '🏆' },
    { label: 'Done today',      value: `${doneToday}/${total}`, icon: '✅' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="card px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">{s.icon}</span>
          <div>
            <p className="display-sm text-ink text-lg leading-none">{s.value}</p>
            <p className="label-upper mt-0.5" style={{ fontSize: '10px' }}>{s.label}</p>
          </div>
        </div>
      ))}
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

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);

  // Stable callback — passed down to every HabitCard as onError
  const handleDeleteError = useCallback((msg: string) => setDeleteError(msg), []);

  const openCreate = (): void => { setEditingHabit(null); setModalOpen(true); };
  const openEdit   = (h: Habit): void => { setEditingHabit(h); setModalOpen(true); };
  const closeModal = (): void => { setModalOpen(false); setEditingHabit(null); };

  const activeHabits   = habits.filter((h) => !h.isArchived);
  const archivedHabits = habits.filter((h) =>  h.isArchived);

  return (
    <div className="min-h-screen bg-canvas">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center text-base">🔁</span>
          <span className="display-sm text-sm text-ink" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            HabitLoop
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted hidden md:block">
            Hey, <strong className="text-ink">{user?.username}</strong> 👋
          </span>
          <Link
            to="/leaderboard"
            className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5"
          >
            🏆 Leaderboard
          </Link>
          <button
            onClick={() => void logout()}
            className="btn-ghost text-xs px-4 py-2"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="label-upper mb-1">Dashboard</p>
            <h1 className="display-lg text-ink">Your habits</h1>
          </div>
          <button onClick={openCreate} className="btn-lime text-sm px-6 py-3">
            + New habit
          </button>
        </div>

        {/* Stats */}
        {activeHabits.length > 0 && <StatsBar habits={activeHabits} />}

        {/* Error state */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Two-column layout for Habits + Feed */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Column — Habits */}
          <div className="flex-1 min-w-0">
            {/* Loading skeleton */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-5 h-48 animate-pulse bg-border/40" />
                ))}
              </div>
            ) : habits.length === 0 ? (
              <EmptyState onAdd={openCreate} />
            ) : (
              <>
                {/* Active habits */}
                {activeHabits.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <hr className="divider flex-1" />
                      <p className="label-upper">Active · {activeHabits.length}</p>
                      <hr className="divider flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {activeHabits.map((h) => (
                        <div key={h.id} className="animate-fade-up">
                          <HabitCard
                            habit={h}
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
                      className="flex items-center gap-2 text-xs text-muted hover:text-ink transition-colors mb-4"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <span>{showArchived ? '▼' : '▶'}</span>
                      Archived · {archivedHabits.length}
                    </button>

                    {showArchived && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {archivedHabits.map((h) => (
                          <HabitCard
                            key={h.id}
                            habit={h}
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
