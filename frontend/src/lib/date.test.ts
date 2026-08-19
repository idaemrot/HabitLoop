import { describe, it, expect } from 'vitest';
import { toLocalDateString } from './date';

describe('toLocalDateString', () => {
  it('matches the UTC calendar date when the timezone is UTC', () => {
    const d = new Date('2026-08-19T12:00:00.000Z');
    expect(toLocalDateString(d, 'UTC')).toBe('2026-08-19');
  });

  // Regression for bug #3: a user west of UTC (e.g. Los Angeles) can have a
  // local calendar date that's still "yesterday" relative to the UTC date.
  it('returns the PREVIOUS day for a UTC-negative timezone late in the UTC day', () => {
    // 2026-08-20T03:00:00Z = 2026-08-19T20:00:00 in America/Los_Angeles (PDT, UTC-7)
    const d = new Date('2026-08-20T03:00:00.000Z');
    expect(d.toISOString().split('T')[0]).toBe('2026-08-20'); // the naive/broken value
    expect(toLocalDateString(d, 'America/Los_Angeles')).toBe('2026-08-19');
  });

  // Regression for bug #3: a user east of UTC (e.g. Tokyo) can have a local
  // calendar date that's already "tomorrow" relative to the UTC date.
  it('returns the NEXT day for a UTC-positive timezone early in the UTC day', () => {
    // 2026-08-19T16:00:00Z = 2026-08-20T01:00:00 in Asia/Tokyo (JST, UTC+9)
    const d = new Date('2026-08-19T16:00:00.000Z');
    expect(d.toISOString().split('T')[0]).toBe('2026-08-19'); // the naive/broken value
    expect(toLocalDateString(d, 'Asia/Tokyo')).toBe('2026-08-20');
  });
});

// Mirrors exactly how HabitCard/DashboardPage decide "checked in today":
// lastCheckIn (stored server-side as midnight UTC of the user's LOCAL date,
// per backend/src/lib/streak.ts) compared by string prefix against `today`.
describe('"checked in today" comparison (bug #3)', () => {
  function checkedToday(lastCheckIn: string, today: string): boolean {
    return lastCheckIn.startsWith(today);
  }

  it('is true once "today" is computed in the user\'s timezone, even though the UTC date differs', () => {
    // User in America/Los_Angeles checks in at 8pm local time — already
    // 3am UTC the next day. The backend stores lastCheckIn as midnight UTC
    // of the LOCAL date string (2026-08-19).
    const lastCheckIn = '2026-08-19T00:00:00.000Z';
    const now = new Date('2026-08-20T03:00:00.000Z'); // 8pm PDT on Aug 19

    const correctToday = toLocalDateString(now, 'America/Los_Angeles');
    const brokenToday = now.toISOString().split('T')[0]; // the old UTC-based logic

    expect(checkedToday(lastCheckIn, correctToday)).toBe(true);
    expect(checkedToday(lastCheckIn, brokenToday)).toBe(false); // the bug
  });
});
