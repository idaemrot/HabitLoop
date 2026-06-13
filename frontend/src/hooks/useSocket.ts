import { useEffect, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../sockets';
import {
  SOCKET_EVENTS,
  type FriendCheckInPayload,
  type StreakUpdatedPayload,
} from '../sockets/events';
import type { Streak } from '../types';

// ─── useSocket ────────────────────────────────────────────────────────────────
//
// Manages the Socket.IO connection lifecycle.
// - Connects when `accessToken` is provided (user is authenticated)
// - Disconnects when `accessToken` becomes null (logout)
// - Reconnects when `accessToken` changes (token rotation after refresh)
//
// Usage: call once at the top of the app (in AuthProvider or App.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export function useSocket(accessToken: string | null): void {
  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken);
    } else {
      disconnectSocket();
    }

    return () => {
      // Cleanup: disconnect when component using this hook unmounts
      disconnectSocket();
    };
  }, [accessToken]);
}

// ─── useStreakUpdates ─────────────────────────────────────────────────────────
//
// Subscribes to 'habit:streak-updated' events emitted to the user's own room.
// Calls onUpdate when the server pushes fresh streak data (e.g. after check-in
// from another tab, or when this tab's HTTP response races with the socket event).
//
// Usage: call inside useHabits (or DashboardPage) to patch streak in local state.
// ─────────────────────────────────────────────────────────────────────────────
export function useStreakUpdates(
  onUpdate: (habitId: string, streak: Partial<Streak>) => void,
): void {
  // Keep onUpdate ref stable to avoid re-subscribing on every render
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const socket = getSocket();

    function handler(payload: StreakUpdatedPayload): void {
      onUpdateRef.current(payload.habitId, {
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        lastCheckIn:   payload.lastCheckIn ?? null,
      });
    }

    socket.on(SOCKET_EVENTS.STREAK_UPDATED, handler);
    return () => { socket.off(SOCKET_EVENTS.STREAK_UPDATED, handler); };
  }, []); // no deps — socket singleton never changes
}

// ─── useFriendFeed ────────────────────────────────────────────────────────────
//
// Subscribes to 'friend:checked-in' events. Returns an array of feed items
// that grows as friends check in. The most recent item is first.
//
// Usage: call in the feed panel / social section of the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
export function useFriendFeed(
  onFriendCheckIn: (payload: FriendCheckInPayload) => void,
): void {
  const callbackRef = useRef(onFriendCheckIn);
  callbackRef.current = onFriendCheckIn;

  useEffect(() => {
    const socket = getSocket();

    function handler(payload: FriendCheckInPayload): void {
      callbackRef.current(payload);
    }

    socket.on(SOCKET_EVENTS.FRIEND_CHECKED_IN, handler);
    return () => { socket.off(SOCKET_EVENTS.FRIEND_CHECKED_IN, handler); };
  }, []);
}
