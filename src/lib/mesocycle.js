// RP-style mesocycle progression engine — pure functions, no I/O.
//
// The whole auto-progression model lives here so it can be unit-tested
// and so the client and coach UIs can never disagree about "what should
// the client lift next week". Nothing is pre-written per week: next
// week's prescription is always computed from last week's actual logs.
//
// Progression rules (documented for Dalton — this is the coaching logic):
//   1. No logs last week            → start_weight (week 1, or fresh exercise)
//   2. Topped the rep range on EVERY set AND avg RIR <= target
//                                   → full bump (+10 lower-body, +5 upper)
//   3. Below rep range on any set OR avg RIR overshot target by 2+
//                                   → repeat same weight (recovery/stall)
//   4. Everything else (in range, didn't top out, RIR close)
//                                   → micro bump +2.5 (keeps momentum)
// Deload (final week of the mesocycle):
//   sets halved (min 2), weight 60% of last week, target RIR 3.

const LOWER_KEYWORDS = [
  'squat', 'deadlift', 'leg press', 'lunge', 'hack', 'leg curl',
  'leg extension', 'calf', 'hip thrust', 'romanian', 'rdl', 'glute',
  'leg day', 'bulgarian',
]

/** 'lower' | 'upper' — keyword match on the exercise name, defaults to upper (+5). */
export function classifyLift(name = '') {
  const n = String(name).toLowerCase()
  return LOWER_KEYWORDS.some(k => n.includes(k)) ? 'lower' : 'upper'
}

/** 1-based week number of a mesocycle given its start date (YYYY-MM-DD). */
export function weekNumber(startDate, todayStr) {
  if (!startDate) return 1
  const today = todayStr || new Date().toISOString().slice(0, 10)
  const ms = new Date(today + 'T12:00:00') - new Date(startDate + 'T12:00:00')
  const w = Math.floor(ms / 86400000 / 7) + 1
  return Math.max(1, w)
}

/** The final week of a mesocycle is always the deload week. */
export function isDeloadWeek(week, totalWeeks) {
  return week >= totalWeeks
}

/**
 * Compute next week's prescription for one exercise.
 *
 * @param {Array<{weight:number,reps:number,rir:number}>} lastWeekSets — last week's logged sets
 * @param {Object} ex — { sets, rep_min, rep_max, target_rir, start_weight, exercise }
 * @returns {{ weight:number, note:'start'|'progressed'|'micro'|'repeat' }}
 */
export function progressExercise(lastWeekSets, ex) {
  const startW = Number(ex.start_weight) || 0
  if (!lastWeekSets || lastWeekSets.length === 0) {
    return { weight: startW, note: 'start' }
  }
  const repMin = Number(ex.rep_min), repMax = Number(ex.rep_max)
  const targetRir = Number(ex.target_rir)

  const toppedAll = lastWeekSets.every(s => Number(s.reps) >= repMax)
  const belowAny = lastWeekSets.some(s => Number(s.reps) < repMin)
  const avgRir = lastWeekSets.reduce((a, s) => a + Number(s.rir), 0) / lastWeekSets.length
  const lastWeight = Number(lastWeekSets[0].weight) || 0
  const bump = classifyLift(ex.exercise) === 'lower' ? 10 : 5

  if (toppedAll && avgRir <= targetRir) {
    return { weight: round25(lastWeight + bump), note: 'progressed' }
  }
  if (belowAny || avgRir >= targetRir + 2) {
    return { weight: lastWeight, note: 'repeat' }
  }
  return { weight: round25(lastWeight + 2.5), note: 'micro' }
}

/** Deload prescription: ~50% volume, 60% load, RIR 3. No grinding. */
export function deloadPrescription(ex, lastWeight) {
  const w = Number(lastWeight ?? ex.start_weight) || 0
  return {
    sets: Math.max(2, Math.ceil(Number(ex.sets) / 2)),
    weight: round25(w * 0.6),
    repMin: Number(ex.rep_min),
    repMax: Number(ex.rep_max),
    targetRir: 3,
  }
}

/**
 * Full-week prescription map for one exercise.
 * @returns {{ sets, weight, repMin, repMax, targetRir, note, deload }}
 */
export function prescriptionFor(ex, week, totalWeeks, lastWeekSets) {
  if (isDeloadWeek(week, totalWeeks)) {
    const lastW = lastWeekSets?.length ? Number(lastWeekSets[0].weight) : Number(ex.start_weight)
    const d = deloadPrescription(ex, lastW)
    return { ...d, note: 'deload', deload: true }
  }
  const p = progressExercise(lastWeekSets, ex)
  return {
    sets: Number(ex.sets),
    weight: p.weight,
    repMin: Number(ex.rep_min),
    repMax: Number(ex.rep_max),
    targetRir: Number(ex.target_rir),
    note: p.note,
    deload: false,
  }
}

/** Total volume (Σ weight × reps) per week from set_logs rows. */
export function weeklyVolumes(setLogs) {
  const byWeek = {}
  for (const s of setLogs || []) {
    const w = Number(s.week_number)
    byWeek[w] = (byWeek[w] || 0) + Number(s.weight) * Number(s.reps)
  }
  return Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b)
    .map(week => ({ week, volume: Math.round(byWeek[week]) }))
}

/**
 * Adherence for one session: prescribed vs logged sets.
 * @returns {{ prescribed:number, logged:number, pct:number|null }}
 */
export function sessionAdherence(templateExercises, setLogs, week, sessionDay) {
  const prescribed = (templateExercises || [])
    .filter(e => e.session_day === sessionDay)
    .reduce((a, e) => a + Number(e.sets), 0)
  const logged = (setLogs || [])
    .filter(s => Number(s.week_number) === week && s.session_day === sessionDay)
    .length
  return { prescribed, logged, pct: prescribed ? Math.round((logged / prescribed) * 100) : null }
}

/**
 * Stall flags: exercises whose top logged weight hasn't increased across
 * the last two logged weeks. Returns [{ exercise, weeksStalled }].
 */
export function stallFlags(setLogs) {
  const byEx = {}
  for (const s of setLogs || []) {
    const k = s.exercise
    byEx[k] = byEx[k] || {}
    const w = Number(s.week_number)
    byEx[k][w] = Math.max(byEx[k][w] || 0, Number(s.weight))
  }
  const flags = []
  for (const [exercise, weeks] of Object.entries(byEx)) {
    const sorted = Object.keys(weeks).map(Number).sort((a, b) => b - a)
    if (sorted.length >= 2 && weeks[sorted[0]] <= weeks[sorted[1]]) {
      flags.push({ exercise, weeksStalled: sorted.length - 1 })
    }
  }
  return flags
}

/** Round to nearest 2.5 (standard plate math). */
export function round25(n) {
  return Math.round(Number(n) / 2.5) * 2.5
}

/** Group set_logs by exercise → { exercise: [sets...] }, newest week first. */
export function logsByExercise(setLogs) {
  const out = {}
  for (const s of setLogs || []) {
    const k = s.exercise
    out[k] = out[k] || []
    out[k].push(s)
  }
  return out
}

/** Distinct session days in template order. */
export function sessionDays(templateExercises) {
  const seen = []
  for (const e of templateExercises || []) {
    if (!seen.includes(e.session_day)) seen.push(e.session_day)
  }
  return seen
}
