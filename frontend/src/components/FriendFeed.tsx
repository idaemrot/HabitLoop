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
      createdAt:     payload.createdAt,
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
      <div className="card p-5 border-0 bg-transparent flex flex-col gap-4">
        <h2 className="display-sm text-ink mb-2">Activity Feed</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-border/40" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-border/40 rounded w-3/4" />
              <div className="h-3 bg-border/40 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card p-5 border-0 bg-transparent flex flex-col gap-4">
      <h2 className="display-sm text-ink">Activity Feed</h2>
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
      
      {items.length === 0 && !error ? (
        <div className="text-center py-8">
          <p className="text-muted text-sm">No activity yet. Add friends to see their progress here!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-canvas transition-colors animate-fade-up">
              {item.avatarUrl ? (
                <img src={item.avatarUrl} alt={item.username} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center text-ink font-bold shrink-0">
                  {item.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1">
                <p className="text-sm text-ink leading-snug">
                  <strong>{item.username}</strong> completed{' '}
                  <span className="inline-flex items-center gap-1 font-medium px-1.5 rounded" style={{ backgroundColor: `${item.habitColor}20`, color: item.habitColor }}>
                    <span>{item.habitIcon}</span>
                    {item.metadata?.habitTitle || item.habitTitle}
                  </span>
                </p>
                <p className="text-xs text-muted mt-1">
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {hasMore && (
            <button 
              onClick={() => void loadMore()} 
              disabled={loadingMore}
              className="btn-ghost text-xs py-2 mt-2 w-full text-center"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
