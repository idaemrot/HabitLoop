import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { friendsApi, usersApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserResult { id: string; username: string; avatarUrl: string | null; }
interface FriendEntry {
  friendship: { id: string; status: string; requesterId: string; receiverId: string };
  friend: UserResult;
}
interface PendingRequest {
  id: string; status: string;
  requester: UserResult;
  receiver:  UserResult;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }: { user: UserResult }): JSX.Element {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.username} className="w-10 h-10 rounded-full object-cover ring-2 ring-border" />;
  }
  const hue = (user.username.charCodeAt(0) * 37) % 360;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},50%,30%)` }}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── FriendsPage ──────────────────────────────────────────────────────────────
export default function FriendsPage(): JSX.Element {
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');

  // ── Search state ────────────────────────────────────────────────────────────
  const [query,        setQuery]        = useState('');
  const [searchResults,setSearchResults]= useState<UserResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [sentIds,      setSentIds]      = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Friends state ───────────────────────────────────────────────────────────
  const [friends,     setFriends]     = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // ── Requests state ──────────────────────────────────────────────────────────
  const [pending,     setPending]     = useState<PendingRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // ── Fetch friends ───────────────────────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const res = await friendsApi.list();
      setFriends(res.data?.data?.friends ?? []);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  // ── Fetch pending requests ──────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await friendsApi.pendingRequests();
      setPending(res.data?.data?.requests ?? []);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => { void loadFriends(); void loadPending(); }, [loadFriends, loadPending]);

  // ── Debounced search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await usersApi.search(query.trim());
        setSearchResults(res.data?.data?.users ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const sendRequest = async (receiverId: string) => {
    try {
      await friendsApi.sendRequest(receiverId);
      setSentIds((prev) => new Set([...prev, receiverId]));
    } catch { /* 409 = already pending — just reflect in UI */ }
  };

  const respondToRequest = async (id: string, action: 'ACCEPTED' | 'DECLINED') => {
    try {
      await friendsApi.respond(id, action);
      setPending((prev) => prev.filter((r) => r.id !== id));
      if (action === 'ACCEPTED') void loadFriends();
    } catch { /* ignore */ }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      await friendsApi.remove(friendshipId);
      setFriends((prev) => prev.filter((f) => f.friendship.id !== friendshipId));
    } catch { /* ignore */ }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--canvas)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
            <h1 className="display-sm text-ink leading-none">Friends</h1>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-2">
          {([ ['friends', 'My Friends'], ['requests', `Requests${pending.length > 0 ? ` (${pending.length})` : ''}`], ['search', 'Find People'] ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold transition-all duration-200 ${
                tab === v ? 'bg-ink text-white' : 'bg-transparent text-muted hover:text-ink border border-border hover:border-ink'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── SEARCH TAB ─────────────────────────────────────────────────── */}
        {tab === 'search' && (
          <div className="flex flex-col gap-5 animate-fade-up">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username…"
                className="input-field pl-10"
                autoFocus
              />
            </div>

            {searching && (
              <div className="flex justify-center py-8">
                <svg className="animate-spin w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {!searching && searchResults.length === 0 && query.trim().length >= 2 && (
              <p className="text-center text-muted text-sm py-8">No users found for "{query}"</p>
            )}

            {!searching && searchResults.length === 0 && query.trim().length < 2 && (
              <p className="text-center text-muted text-sm py-8">Type at least 2 characters to search</p>
            )}

            {searchResults.map((user) => {
              const alreadyFriend = friends.some((f) => f.friend.id === user.id);
              const sent = sentIds.has(user.id);
              return (
                <div key={user.id} className="card px-5 py-4 flex items-center gap-4">
                  <Avatar user={user} />
                  <div className="flex-1">
                    <p className="font-semibold text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {user.username}
                    </p>
                    {alreadyFriend && <p className="text-xs text-muted mt-0.5">Already friends</p>}
                  </div>
                  {!alreadyFriend && (
                    <button
                      onClick={() => void sendRequest(user.id)}
                      disabled={sent}
                      className={sent ? 'btn-ghost text-xs px-4 py-2 opacity-60' : 'btn-lime text-xs px-4 py-2'}
                    >
                      {sent ? 'Request sent' : '+ Add friend'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── REQUESTS TAB ───────────────────────────────────────────────── */}
        {tab === 'requests' && (
          <div className="flex flex-col gap-4 animate-fade-up">
            {loadingPending ? (
              [1,2].map((i) => <div key={i} className="card h-16 animate-pulse bg-border/30" />)
            ) : pending.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted text-sm">No pending friend requests</p>
                <button onClick={() => setTab('search')} className="btn-lime text-xs px-6 py-2.5 mt-4">
                  Find people
                </button>
              </div>
            ) : pending.map((req) => (
              <div key={req.id} className="card px-5 py-4 flex items-center gap-4">
                <Avatar user={req.requester} />
                <div className="flex-1">
                  <p className="font-semibold text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {req.requester.username}
                  </p>
                  <p className="text-xs text-muted mt-0.5">wants to be your friend</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void respondToRequest(req.id, 'ACCEPTED')}
                    className="btn-lime text-xs px-4 py-2"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => void respondToRequest(req.id, 'DECLINED')}
                    className="btn-ghost text-xs px-4 py-2"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FRIENDS TAB ────────────────────────────────────────────────── */}
        {tab === 'friends' && (
          <div className="flex flex-col gap-4 animate-fade-up">
            {loadingFriends ? (
              [1,2,3].map((i) => <div key={i} className="card h-16 animate-pulse bg-border/30" />)
            ) : friends.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted text-sm">No friends yet</p>
                <button onClick={() => setTab('search')} className="btn-lime text-xs px-6 py-2.5 mt-4">
                  Find people
                </button>
              </div>
            ) : friends.map(({ friendship, friend }) => (
              <div key={friendship.id} className="card px-5 py-4 flex items-center gap-4">
                <Avatar user={friend} />
                <div className="flex-1">
                  <p className="font-semibold text-ink text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {friend.username}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Friend</p>
                </div>
                <button
                  onClick={() => void removeFriend(friendship.id)}
                  className="btn-ghost text-xs px-4 py-2 text-muted hover:text-red-500 hover:border-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
