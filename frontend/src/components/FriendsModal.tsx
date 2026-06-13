import { useState, useEffect, useCallback, useRef } from 'react';
import { friendsApi, usersApi } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserResult { id: string; username: string; avatarUrl: string | null; }
interface FriendEntry {
  friendship: { id: string; status: string };
  friend: UserResult;
}
interface PendingRequest {
  id: string;
  requester: UserResult;
  receiver:  UserResult;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }: { user: UserResult }): JSX.Element {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.username} className="w-9 h-9 rounded-full object-cover ring-2 ring-border shrink-0" />;
  }
  const hue = (user.username.charCodeAt(0) * 37) % 360;
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{ background: `hsl(${hue},60%,88%)`, color: `hsl(${hue},50%,30%)` }}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface FriendsModalProps { onClose: () => void; }

// ─── FriendsModal ─────────────────────────────────────────────────────────────
export default function FriendsModal({ onClose }: FriendsModalProps): JSX.Element {
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');

  // ── Search ──────────────────────────────────────────────────────────────────
  const [query,         setQuery]         = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [sentIds,       setSentIds]       = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Friends ─────────────────────────────────────────────────────────────────
  const [friends,        setFriends]        = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // ── Pending requests ────────────────────────────────────────────────────────
  const [pending,        setPending]        = useState<PendingRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try { const r = await friendsApi.list(); setFriends(r.data?.data?.friends ?? []); }
    finally { setLoadingFriends(false); }
  }, []);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try { const r = await friendsApi.pendingRequests(); setPending(r.data?.data?.requests ?? []); }
    finally { setLoadingPending(false); }
  }, []);

  useEffect(() => { void loadFriends(); void loadPending(); }, [loadFriends, loadPending]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try { const r = await usersApi.search(query.trim()); setSearchResults(r.data?.data?.users ?? []); }
      catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const sendRequest = async (receiverId: string) => {
    try { await friendsApi.sendRequest(receiverId); setSentIds((p) => new Set([...p, receiverId])); }
    catch { /* 409 already sent */ }
  };

  const respond = async (id: string, action: 'ACCEPTED' | 'DECLINED') => {
    try {
      await friendsApi.respond(id, action);
      setPending((p) => p.filter((r) => r.id !== id));
      if (action === 'ACCEPTED') void loadFriends();
    } catch { /* ignore */ }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      await friendsApi.remove(friendshipId);
      setFriends((p) => p.filter((f) => f.friendship.id !== friendshipId));
    } catch { /* ignore */ }
  };

  const TABS = [
    { value: 'friends'  as const, label: 'Friends' },
    { value: 'requests' as const, label: `Requests${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { value: 'search'   as const, label: 'Find People' },
  ];

  return (
    <>
      {/* Transparent backdrop — click-outside closes */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown panel — anchored below the button via absolute on the relative wrapper */}
      <div
        className="absolute right-0 top-full mt-2 z-50 w-[420px] bg-surface rounded-2xl shadow-panel border border-border flex flex-col animate-fade-up"
        style={{ maxHeight: '520px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <p className="label-upper">Social</p>
            <h2 className="display-sm text-ink mt-0.5">Friends</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-canvas hover:text-ink transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-border shrink-0">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-1.5 rounded-pill text-xs font-semibold transition-all ${
                tab === t.value ? 'bg-ink text-white' : 'text-muted hover:text-ink border border-border hover:border-ink'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">

          {/* SEARCH */}
          {tab === 'search' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username…"
                  className="input-field pl-9"
                  autoFocus
                />
              </div>

              {searching && (
                <div className="flex justify-center py-6">
                  <svg className="animate-spin w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}

              {!searching && query.trim().length < 2 && (
                <p className="text-center text-muted text-sm py-6">Type at least 2 characters to search</p>
              )}
              {!searching && query.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-center text-muted text-sm py-6">No users found for "{query}"</p>
              )}

              {searchResults.map((user) => {
                const alreadyFriend = friends.some((f) => f.friend.id === user.id);
                const sent = sentIds.has(user.id);
                return (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white">
                    <Avatar user={user} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {user.username}
                      </p>
                      {alreadyFriend && <p className="text-xs text-muted">Already friends</p>}
                    </div>
                    {!alreadyFriend && (
                      <button
                        onClick={() => void sendRequest(user.id)}
                        disabled={sent}
                        className={sent ? 'btn-ghost text-xs px-3 py-1.5 opacity-60' : 'btn-lime text-xs px-3 py-1.5'}
                      >
                        {sent ? 'Sent' : '+ Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* REQUESTS */}
          {tab === 'requests' && (
            <div className="flex flex-col gap-3">
              {loadingPending ? (
                [1, 2].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse bg-border/30" />)
              ) : pending.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted text-sm">No pending requests</p>
                  <button onClick={() => setTab('search')} className="btn-lime text-xs px-5 py-2 mt-4">Find people</button>
                </div>
              ) : pending.map((req) => (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white">
                  <Avatar user={req.requester} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {req.requester.username}
                    </p>
                    <p className="text-xs text-muted">wants to be your friend</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => void respond(req.id, 'ACCEPTED')} className="btn-lime text-xs px-3 py-1.5">Accept</button>
                    <button onClick={() => void respond(req.id, 'DECLINED')} className="btn-ghost text-xs px-3 py-1.5">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FRIENDS */}
          {tab === 'friends' && (
            <div className="flex flex-col gap-3">
              {loadingFriends ? (
                [1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl animate-pulse bg-border/30" />)
              ) : friends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted text-sm">No friends yet</p>
                  <button onClick={() => setTab('search')} className="btn-lime text-xs px-5 py-2 mt-4">Find people</button>
                </div>
              ) : friends.map(({ friendship, friend }) => (
                <div key={friendship.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white">
                  <Avatar user={friend} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {friend.username}
                    </p>
                    <p className="text-xs text-muted">Friend</p>
                  </div>
                  <button
                    onClick={() => void removeFriend(friendship.id)}
                    className="btn-ghost text-xs px-3 py-1.5 text-muted hover:text-red-500 hover:border-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
