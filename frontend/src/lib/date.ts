// ─── Timezone-aware "today" helper ────────────────────────────────────────────
// Mirrors backend/src/lib/streak.ts's toLocalDateString — the server always
// computes "today" and stores lastCheckIn/completedDate in the user's stored
// IANA timezone, so the frontend must use the same definition when deciding
// whether a habit was checked in today. Using the browser's UTC date (e.g.
// `new Date().toISOString().split('T')[0]`) is wrong for any user whose local
// calendar date differs from the UTC calendar date at render time — which is
// most hours of the day for anyone outside UTC.
export function toLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
