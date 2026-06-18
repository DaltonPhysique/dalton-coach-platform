// ════════════════════════════════════════════════════════════
// DEMO DATA — NOT CONNECTED TO SUPABASE.
//
// These fixtures back the Insights, Body (Scorecard/Body Fat/
// Measurements), Progress (PRs/Check-In/Countdown), Recovery,
// and Logbook screens. There are no recovery_logs or
// workout_logs tables in supabase/schema.sql, and this file
// must stay that way until a real schema migration is reviewed
// and run separately. Every screen using this data shows the
// "Demo data" badge so it's never mistaken for a live value.
// ════════════════════════════════════════════════════════════

export const DEMO_RECOVERY_HISTORY = [
  { date: 'Jun 18, 2026', sleep: 4, energy: 5, soreness: 4, stress: 5, digestion: 4, morningSignal: false, score: 22 },
  { date: 'Jun 17, 2026', sleep: 4, energy: 4, soreness: 3, stress: 4, digestion: 3, morningSignal: false, score: 18 },
  { date: 'Jun 16, 2026', sleep: 3, energy: 3, soreness: 4, stress: 4, digestion: 3, morningSignal: true, score: 17 },
]

export const DEMO_RECOVERY_TODAY = {
  sleep: 3,
  energy: 3,
  soreness: 3,
  stress: 3,
  digestion: 3,
  morningSignal: false,
}

export const DEMO_LOGBOOK_ENTRIES = [
  {
    date: 'Jun 17, 2026',
    session: 'Lower A',
    exercise: 'Seated Leg Curl',
    set1: '120lbs × 12',
    set2: '120lbs × 12',
    rir: 2,
  },
]

export const DEMO_INSIGHTS = [
  {
    status: 'ok',
    headline: 'Recovery is solid — avg 19/25',
    body: "Your body is adapting well. This is the signature of a well-executed cut: performance protected, recovery maintained.",
  },
  {
    status: 'critical',
    headline: 'Hormone signal: Morning erections absent 3+ days',
    body: 'This is the clearest early warning sign of hormonal suppression — usually from excessive calorie restriction or high cortisol. Do NOT cut calories further. Prioritize sleep, carbohydrates, and stress management.',
  },
  {
    status: 'ok',
    headline: '1 PR in the last 30 days 🏆',
    body: "PRs while in a deficit = the best possible outcome. You're losing fat and building or maintaining strength simultaneously. This is textbook recomp. Keep the exact approach.",
  },
]

export const DEMO_SCORECARD = {
  total: 79,
  nutrition: 25,
  training: 25,
  recovery: 19,
  momentum: 10,
  note: 'Strong week. Look for gaps to tighten.',
}

export const DEMO_BODY_FAT = {
  current: 21,
  history: [
    { date: 'Jun 1, 2026', percent: 22 },
    { date: 'Jun 18, 2026', percent: 21 },
  ],
}

export const DEMO_MEASUREMENTS = [
  { label: 'Waist', value: '36.0 in' },
  { label: 'Chest', value: '44.5 in' },
  { label: 'Arms', value: '15.8 in' },
]

export const DEMO_PRS = [
  {
    date: 'May 22, 2026',
    exercise: 'Hack Squat',
    detail: '405 lbs × 9',
    tag: 'Weight PR',
  },
]

export const DEMO_CHECKIN_HISTORY = [
  { week: 'Jun 9–15, 2026', training: 5, nutrition: 4, sleep: 3, feeling: 4 },
]

export const DEMO_COUNTDOWN = {
  remainingLbs: 16,
  weeksAtOnePerWeek: 16,
  estimatedDate: 'Oct 2026',
}
