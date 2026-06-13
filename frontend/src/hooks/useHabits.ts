import { useState, useEffect, useCallback } from 'react';
import { habitApi } from '../api/client';
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from '../types';

// ─── useHabits ────────────────────────────────────────────────────────────────
// Central data hook for habit management — used by Dashboard and modals
export function useHabits(includeArchived = false) {
  const [habits,  setHabits]  = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchHabits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await habitApi.list(includeArchived);
      setHabits(res.data?.data?.habits ?? []);
    } catch {
      setError('Failed to load habits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => { void fetchHabits(); }, [fetchHabits]);

  // ── Create ───────────────────────────────────────────────────────────────
  const createHabit = useCallback(async (payload: CreateHabitPayload): Promise<Habit> => {
    const res  = await habitApi.create(payload);
    const habit: Habit = res.data.data.habit;
    setHabits((prev) => [habit, ...prev]);
    return habit;
  }, []);

  // ── Update ───────────────────────────────────────────────────────────────
  const updateHabit = useCallback(async (id: string, payload: UpdateHabitPayload): Promise<Habit> => {
    const res  = await habitApi.update(id, payload);
    const updated: Habit = res.data.data.habit;
    setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
    return updated;
  }, []);

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteHabit = useCallback(async (id: string): Promise<void> => {
    await habitApi.delete(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Archive toggle ────────────────────────────────────────────────────────
  const archiveHabit = useCallback(async (id: string, archived: boolean): Promise<void> => {
    const res = await habitApi.archive(id, archived);
    const updated: Habit = res.data.data.habit;
    setHabits((prev) =>
      includeArchived
        ? prev.map((h) => (h.id === id ? updated : h))
        : prev.filter((h) => h.id !== id),  // remove from list if showing active only
    );
  }, [includeArchived]);

  return {
    habits,
    loading,
    error,
    fetchHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
  };
}
