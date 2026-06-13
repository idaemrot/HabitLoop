import { useState, useEffect, useCallback, useRef } from 'react';
import { leaderboardApi } from '../api/client';
import { getSocket }      from '../sockets';
import { SOCKET_EVENTS }  from '../sockets/events';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

export interface LeaderboardEntry {
  rank:      number;
  userId:    string;
  username:  string;
  avatarUrl: string | null;
  score:     number;
}

export interface MyRank {
  rank:  number;
  score: number;
}

interface UseLeaderboardResult {
  entries:   LeaderboardEntry[];
  myRank:    MyRank | null;
  loading:   boolean;
  error:     string | null;
  period:    LeaderboardPeriod;
  setPeriod: (p: LeaderboardPeriod) => void;
  refresh:   () => void;
}

// ─── useLeaderboard ───────────────────────────────────────────────────────────
//
// Fetches the leaderboard and the current user's rank for the selected period.
// Subscribes to the 'leaderboard:updated' socket event so the board refreshes
// automatically when any friend checks in and scores update.
//
// The socket event is informational — it triggers a re-fetch rather than
// patching state directly. This keeps Redis as the authoritative source.
// ─────────────────────────────────────────────────────────────────────────────
export function useLeaderboard(): UseLeaderboardResult {
  const [period,  setPeriod]  = useState<LeaderboardPeriod>('weekly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank,  setMyRank]  = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchRef = useRef(0); // cancellation counter for stale requests

  const fetchLeaderboard = useCallback(async (p: LeaderboardPeriod) => {
    const generation = ++fetchRef.current;
    setLoading(true);
    setError(null);

    try {
      const [boardRes, rankRes] = await Promise.allSettled([
        leaderboardApi.list(p, 50),
        leaderboardApi.myRank(p),
      ]);

      // Bail if a newer fetch has already started
      if (generation !== fetchRef.current) return;

      if (boardRes.status === 'fulfilled') {
        const raw: LeaderboardEntry[] = boardRes.value.data?.data?.entries ?? [];
        setEntries(raw);
      } else {
        setError('Failed to load leaderboard.');
      }

      if (rankRes.status === 'fulfilled') {
        const d = rankRes.value.data?.data;
        setMyRank(d ? { rank: d.rank as number, score: d.score as number } : null);
      } else {
        // 404 = user not yet on the board — not an error
        setMyRank(null);
      }
    } catch {
      if (generation === fetchRef.current) setError('Failed to load leaderboard.');
    } finally {
      if (generation === fetchRef.current) setLoading(false);
    }
  }, []);

  // Fetch whenever period changes
  useEffect(() => {
    void fetchLeaderboard(period);
  }, [period, fetchLeaderboard]);

  // Subscribe to leaderboard:updated socket event
  // Re-fetch on every emit — the event is just a "please refresh" ping.
  useEffect(() => {
    const socket = getSocket();

    function onLeaderboardUpdated(): void {
      void fetchLeaderboard(period);
    }

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated);
    return () => { socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATED, onLeaderboardUpdated); };
  }, [period, fetchLeaderboard]);

  return {
    entries,
    myRank,
    loading,
    error,
    period,
    setPeriod,
    refresh: () => { void fetchLeaderboard(period); },
  };
}
