// Default daily checklist shown to a client when the coach has not
// created custom checklist_items for them. Single source of truth —
// imported by the client HomeScreen (rendering) and the coach
// dashboard (traffic-light denominator). Keep both in sync by editing
// this file only.
export const DEFAULT_CHECKLIST = [
  'Black coffee — cortisol prime',
  'Weigh in (post-void, pre-coffee) + log weight',
  'Score daily recovery (sleep, energy, soreness)',
  'Meal 1 — protein + carbs',
  'Pre-training carbs hit',
  'Post-workout shake',
  'Dinner logged',
  'Hit your protein target for the day',
  'Magnesium + Zinc before bed',
]
