// ─── Timezone-aware date utilities ────────────────────────────────────────────
//
// All date logic uses the user's stored timezone (User.timezone, IANA string).
// PostgreSQL stores completedDate as DATE (no time, no zone).
// We store the user's local calendar date as midnight UTC of that date string.
//
// Example: user in IST (UTC+5:30) checks in at 23:00 IST = 17:30 UTC
//   toLocalDate(now, 'Asia/Kolkata') → "2024-01-15"
//   storedDate = new Date("2024-01-15T00:00:00.000Z")
//
// The @@unique([habitId, completedDate]) constraint prevents duplicates.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the calendar date string (YYYY-MM-DD) for a UTC timestamp
 * converted to the given IANA timezone.
 *
 * Uses 'sv-SE' locale which produces exactly YYYY-MM-DD format.
 */
export function toLocalDateString(utcDate: Date, timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  }).format(utcDate);
}

/**
 * Returns a Date representing midnight UTC of a given YYYY-MM-DD string.
 * This is how Prisma @db.Date stores dates.
 */
export function dateStringToUTC(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Adds `days` to a YYYY-MM-DD string and returns the resulting YYYY-MM-DD.
 * Works purely on the date string without timezone complications.
 */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Streak Calculation Algorithm ─────────────────────────────────────────────
//
// Inputs:
//   checkInDates — all completedDate values for this habit (any order, may repeat)
//   timezone     — IANA timezone string from User.timezone
//
// Outputs:
//   currentStreak  — consecutive days ending today or yesterday (grace period)
//   longestStreak  — maximum consecutive run ever
//   lastCheckIn    — most recent check-in date as UTC midnight Date
//   totalCompletions — count of unique check-in days
//
// Algorithm:
//   1. Convert every DB date to the user's local YYYY-MM-DD string.
//   2. Deduplicate (paranoia — DB unique constraint already prevents this).
//   3. Sort ascending for a stable ordered list.
//
//   Current streak:
//     Start from the most recent date going backward.
//     If the most recent date is not today or yesterday → streak is broken → 0.
//     Walk the sorted list in reverse, stepping one day at a time.
//     Count until a gap is found.
//
//   Longest streak:
//     Walk the sorted ASC list comparing consecutive pairs.
//     Track the maximum run length.
//     Also compare against currentStreak (handles the edge case where the
//     current run is the longest ever but hasn't exceeded a past run yet).
//
// Why allow yesterday as the "streak start"?
//   A user in UTC-11 at midnight UTC has not yet had their full day.
//   Requiring only "today" would silently break streaks for late-timezone users
//   who haven't had a chance to check in yet.
// ─────────────────────────────────────────────────────────────────────────────

export interface StreakResult {
  currentStreak:    number;
  longestStreak:    number;
  lastCheckIn:      Date | null;
  totalCompletions: number;
}

export function calculateStreaks(
  checkInDates: Date[],
  timezone: string,
): StreakResult {
  if (checkInDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCheckIn: null, totalCompletions: 0 };
  }

  // Step 1: localise & deduplicate
  const unique = [...new Set(
    checkInDates.map((d) => toLocalDateString(d, timezone)),
  )];

  // Step 2: sort ascending
  unique.sort();

  const total     = unique.length;
  const today     = toLocalDateString(new Date(), timezone);
  const yesterday = shiftDate(today, -1);
  const mostRecent = unique[unique.length - 1];

  // ── Current streak ──────────────────────────────────────────────────────
  let current = 0;

  if (mostRecent === today || mostRecent === yesterday) {
    // cursor tracks the expected date for each consecutive step backward
    let cursor = mostRecent;
    for (let i = unique.length - 1; i >= 0; i--) {
      if (unique[i] === cursor) {
        current++;
        cursor = shiftDate(cursor, -1);
      } else {
        break; // gap found — stop counting
      }
    }
  }

  // ── Longest streak ──────────────────────────────────────────────────────
  let longest = 1;
  let run     = 1;

  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === shiftDate(unique[i - 1], 1)) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // currentStreak may be longer than any past run (e.g. user has a new best)
  longest = Math.max(longest, current);

  const lastCheckIn = dateStringToUTC(mostRecent);

  return { currentStreak: current, longestStreak: longest, lastCheckIn, totalCompletions: total };
}
