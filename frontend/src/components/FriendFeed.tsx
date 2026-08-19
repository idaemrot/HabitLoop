import { useState, useEffect, useCallback } from 'react';
import { feedApi } from '../api/client';
import { useFriendFeed } from '../hooks/useSocket';
import type { FriendCheckInPayload } from '../sockets/events';

// ─── Types ────────────────────────────────────────────────────────────────────
// Using a unified type that can hold either the REST feed item or the Socket payload.
// For simplicity, we adapt both to this shape.
export interface FeedItemData {
  id:            string;
  userId:        string;
  username:      string;
  avatarUrl:     string | null;
  habitId:       string;
  habitTitle:    string;
  habitColor:    string;
  habitIcon:     string;
  activityType:  string;
  metadata:      any;
  createdAt:     string;
  // Only present for live socket-delivered check-ins — the REST feed's
  // stored Activity.metadata doesn't carry a streak count, so historical
  // items simply omit this rather than showing a fabricated number.
  currentStreak?: number;
}

// ─── Relative time ────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function FeedAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }): JSX.Element {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} className="w-9 h-9 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-canvas border border-border flex items-center justify-center text-ink font-semibold text-sm shrink-0">
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── FriendFeed Component ─────────────────────────────────────────────────────
export default function FriendFeed(): JSX.Element {
  const [items,    setItems]    = useState<FeedItemData[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [hasMore,  setHasMore]  = useState(false);
  const [cursor,   setCursor]   = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Fetch initial feed ──────────────────────────────────────────────────────
  const fetchFeed = useCallback(async (currentCursor?: string) => {
    try {
      const res = await feedApi.list(20, currentCursor);
      const data = res.data?.data;
      if (!data) return;

      const rawItems = data.items || [];
      const formattedItems: FeedItemData[] = rawItems.map((item: any) => ({
        id:            item.id,
        userId:        item.user?.id,
        username:      item.user?.username,
        avatarUrl:     item.user?.avatarUrl || null,
        habitId:       item.habit?.id || '',
        habitTitle:    item.habit?.title || 'Unknown Habit',
        habitColor:    item.habit?.color || '#0F0F0F',
        habitIcon:     item.habit?.icon || '🔁',
        activityType:  item.activityType,
        metadata:      item.metadata,
        createdAt:     item.createdAt,
      }));

      setItems((prev) => currentCursor ? [...prev, ...formattedItems] : formattedItems);
      setHasMore(data.pagination.hasMore);
      setCursor(data.pagination.cursor);
    } catch {
      setError('Failed to load feed.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchFeed(cursor);
    setLoadingMore(false);
  };

  // ── Handle Real-Time Updates ────────────────────────────────────────────────
  useFriendFeed((payload: FriendCheckInPayload) => {
    const newItem: FeedItemData = {
      id:            payload.activityId,
      userId:        payload.userId,
      username:      payload.username,
      avatarUrl:     payload.avatarUrl,
      habitId:       payload.habitId,
      habitTitle:    payload.habitTitle,
      habitColor:    payload.habitColor,
      habitIcon:     payload.habitIcon,
      activityType:  'HABIT_CHECKED_IN',
      metadata:      {
        habitTitle:    payload.habitTitle,
        completedDate: payload.completedDate,
      },
      createdAt:      payload.createdAt,
      currentStreak:  payload.currentStreak,
    };

    // Add to top of feed with a subtle entry animation
    setItems((prev) => {
      // Prevent duplicates in case HTTP raced with socket
      if (prev.some(item => item.id === newItem.id)) return prev;
      return [newItem, ...prev];
    });
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="label-upper">Activity</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="label-upper">Activity</h2>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {items.length === 0 && !error ? (
        <div className="py-8">
          <p className="text-muted text-sm leading-relaxed">
            No activity yet. Add friends to see their progress here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 py-3.5 first:pt-0 animate-fade-up">
              <FeedAvatar username={item.username} avatarUrl={item.avatarUrl} />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink leading-snug">
                  <strong className="font-semibold">{item.username}</strong> completed{' '}
                  <span className="font-medium" style={{ color: item.habitColor }}>
                    {item.metadata?.habitTitle || item.habitTitle}
                  </span>
                </p>
                <p className="text-xs text-muted mt-1">
                  {item.currentStreak != null && (
                    <>{item.currentStreak} day streak<span className="mx-1.5" aria-hidden="true">·</span></>
                  )}
                  {timeAgo(item.createdAt)}
                </p>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="btn-ghost text-xs py-2 mt-3 w-full text-center"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
