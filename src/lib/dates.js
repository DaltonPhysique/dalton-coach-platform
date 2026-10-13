// Local-date helpers — single source of truth for "today".
//
// NEVER use `new Date().toISOString().slice(0, 10)` for day-grouping:
// that's a UTC date, so a 9pm ET weigh-in lands on "tomorrow" and poisons
// streaks, deltas, and checklist grouping. Always go through here.

/** YYYY-MM-DD in the device's local timezone. */
export function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Whole days between two YYYY-MM-DD strings (date-only math, DST-safe). */
export function daysBetween(a, b) {
  if (!a || !b) return null
  const ms = new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')
  return Math.round(ms / 86400000)
}
