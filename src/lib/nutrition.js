// ════════════════════════════════════════════════════════════
// NUTRITION — day-type resolution (MacroFactor-style daily targets).
//
// A nutrition template has one macro row per day type:
// 'training' (push/pull/upper), 'legs' (leg day), 'rest'.
// The client Fuel tab resolves "today's targets" with:
//   1. manual override wins (client tapped Training / Legs / Rest)
//   2. else auto: today's logged session day name → legs keywords?
//   3. else 'training' if the client has an active mesocycle,
//      otherwise 'rest'.
// The resolved type is always shown on screen, so auto is never
// silently wrong — one tap fixes it.
// ════════════════════════════════════════════════════════════

export const DAY_TYPES = ['training', 'legs', 'rest']

export const DAY_LABELS = {
  training: 'Training',
  legs: 'Leg day',
  rest: 'Rest',
}

const LEG_KEYWORDS = ['leg', 'quad', 'hamstring', 'glute', 'calf']

export function isLegDay(sessionDayName) {
  const name = (sessionDayName || '').toLowerCase()
  return LEG_KEYWORDS.some(k => name.includes(k))
}

/**
 * Resolve which day type applies.
 * @param {string|null} sessionDayName — e.g. today's logged session day
 * @param {string|null} dayOverride — client's manual choice or null
 * @returns {'training'|'legs'|'rest'|null}
 */
export function resolveDayType({ sessionDayName, dayOverride }) {
  if (dayOverride && DAY_TYPES.includes(dayOverride)) return dayOverride
  const name = (sessionDayName || '').trim()
  if (!name) return null
  return isLegDay(name) ? 'legs' : 'training'
}

/**
 * Infer the day type from a list of session-day names logged today.
 * @returns {'legs'|'training'|null}
 */
export function inferDayTypeFromLogs(sessionDayNames) {
  const names = (sessionDayNames || []).filter(Boolean)
  if (!names.length) return null
  return names.some(isLegDay) ? 'legs' : 'training'
}

/**
 * Pick the macro row for a day type from template day rows.
 * @returns the matching row or null
 */
export function todaysMacros(templateDays, dayType) {
  if (!dayType) return null
  return (templateDays || []).find(d => d.day_type === dayType) || null
}
