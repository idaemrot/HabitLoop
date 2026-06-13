import { useState, useCallback } from 'react';
import { checkInApi } from '../api/client';
import type { Habit, Streak } from '../types';

// ─── useCheckIn ───────────────────────────────────────────────────────────────
// Manages the check-in state for a single habit card.
// Keeps loading + error state local to each card instance.
//
// On success: returns the updated streak so the parent can update its state.
// On conflict (409): signals that the habit is already checked in today.
// On error: propagates a message string for the caller to surface.

interface UseCheckInReturn {
  isChecking: boolean;
  checkIn:    (note?: string) => Promise<Streak | null>;
  undo:       () => Promise<Streak | null>;
}

export function useCheckIn(habit: Habit): UseCheckInReturn {
  const [isChecking, setIsChecking] = useState(false);

  const checkIn = useCallback(async (note?: string): Promise<Streak | null> => {
    setIsChecking(true);
    try {
      const res = await checkInApi.create(habit.id, note);
      // Response shape: { status, data: { checkIn, streak, streakStats } }
      return res.data?.data?.streak as Streak ?? null;
    } finally {
      setIsChecking(false);
    }
  }, [habit.id]);

  const undo = useCallback(async (): Promise<Streak | null> => {
    setIsChecking(true);
    try {
      const res = await checkInApi.undo(habit.id);
      return res.data?.data?.streak as Streak ?? null;
    } finally {
      setIsChecking(false);
    }
  }, [habit.id]);

  return { isChecking, checkIn, undo };
}
