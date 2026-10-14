// ════════════════════════════════════════════════════════════
// BASE TEMPLATES — one-tap starting programs for the coach.
//
// Each template: { name, weeks, goal, days: [ { day, exercises: [
// { exercise, sets, rep_min, rep_max, target_rir, start_weight, notes } ] } ] }.
//
// start_weight is 0 for all — the client logs real weights in week 1
// and the progression engine takes it from there. "Use this template"
// on the Templates page clones one of these into mesocycle_templates
// + template_exercises, then opens it for editing.
// ════════════════════════════════════════════════════════════

const ex = (exercise, sets, rep_min, rep_max, target_rir, notes = '') => ({
  exercise, sets, rep_min, rep_max, target_rir, start_weight: 0, notes,
})

export const BASE_TEMPLATES = [
  {
    name: '4-Day Maximum Mass Split',
    weeks: 5,
    goal: 'Mass',
    days: [
      {
        day: 'Day 1 — Back & Biceps',
        exercises: [
          ex('Deadlift', 2, 5, 5, 2),
          ex('One Arm Dumbbell Row', 3, 8, 12, 2),
          ex('Wide Grip Pull-Up or Lat Pulldown', 3, 10, 12, 2),
          ex('Barbell Row', 3, 8, 12, 2),
          ex('Seated Cable Row or Machine Row', 1, 12, 20, 3, 'Burnout — was 5-min burn in original'),
          ex('EZ Bar Preacher Curl', 3, 10, 12, 2),
          ex('Concentration Curl', 3, 10, 12, 3),
          ex('Seated Dumbbell Curl', 1, 12, 20, 3, 'Burnout — was 5-min burn in original'),
        ],
      },
      {
        day: 'Day 2 — Chest & Triceps',
        exercises: [
          ex('Bench Press', 3, 6, 10, 2),
          ex('Incline Dumbbell Bench Press', 3, 8, 12, 2),
          ex('Chest Dip', 3, 8, 15, 2, 'AMRAP'),
          ex('Cable Crossover or Pec Dec', 3, 12, 15, 2),
          ex('Machine Press or DB Bench Press', 1, 12, 20, 3, 'Burnout'),
          ex('EZ Bar Skullcrusher', 3, 8, 12, 2),
          ex('Two Arm Seated DB Extension', 3, 8, 12, 3),
          ex('Cable Tricep Extension', 1, 12, 20, 3, 'Burnout'),
        ],
      },
      {
        day: 'Day 3 — Quads, Hamstrings, Calves',
        exercises: [
          ex('Squat', 3, 6, 10, 2),
          ex('Leg Press', 3, 15, 20, 2),
          ex('Hack Squat or Dumbbell Lunge', 3, 8, 12, 2),
          ex('Leg Extension', 1, 12, 20, 3, 'Burnout'),
          ex('Stiff Leg Deadlift', 3, 8, 12, 2),
          ex('Leg Curl', 1, 12, 20, 3, 'Burnout'),
          ex('Standing Calf Raise', 3, 10, 15, 2),
          ex('Seated Calf Raise', 1, 12, 20, 3, 'Burnout'),
        ],
      },
      {
        day: 'Day 4 — Shoulders, Traps, Forearms',
        exercises: [
          ex('Seated Barbell Press', 3, 6, 10, 2),
          ex('Seated Arnold Press', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 3, 10, 15, 2),
          ex('Hammer Strength Press or Smith Press', 1, 12, 20, 3, 'Burnout'),
          ex('Upright Row', 3, 8, 12, 2),
          ex('Barbell Shrug or Dumbbell Shrug', 1, 12, 20, 3, 'Burnout'),
          ex('Seated Barbell Wrist Curl', 3, 12, 15, 3),
          ex('Barbell Static Hold', 1, 1, 1, 3, 'Max hold — as long as possible'),
        ],
      },
    ],
  },
  {
    name: '3-Day Full Body — Busy Man Cut',
    weeks: 5,
    goal: 'Fat loss',
    days: [
      {
        day: 'Day A — Full Body A',
        exercises: [
          ex('Squat', 3, 6, 10, 2),
          ex('Bench Press', 3, 6, 10, 2),
          ex('Barbell Row', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 2, 12, 15, 2),
          ex('EZ Bar Curl', 2, 10, 12, 3),
        ],
      },
      {
        day: 'Day B — Full Body B',
        exercises: [
          ex('Deadlift', 2, 5, 5, 2),
          ex('Overhead Press', 3, 8, 12, 2),
          ex('Lat Pulldown', 3, 8, 12, 2),
          ex('Lying Leg Curl', 2, 10, 12, 2),
          ex('Tricep Pushdown', 2, 10, 12, 3),
        ],
      },
      {
        day: 'Day C — Full Body C',
        exercises: [
          ex('Leg Press', 3, 10, 15, 2),
          ex('Incline Dumbbell Press', 3, 8, 12, 2),
          ex('Seated Cable Row', 3, 8, 12, 2),
          ex('Leg Extension', 2, 12, 15, 3),
          ex('Hammer Curl', 2, 10, 12, 3),
        ],
      },
    ],
  },
  {
    name: 'Upper / Lower 4-Day',
    weeks: 5,
    goal: 'Mass',
    days: [
      {
        day: 'Day 1 — Upper A',
        exercises: [
          ex('Bench Press', 3, 6, 10, 2),
          ex('Barbell Row', 3, 8, 12, 2),
          ex('Overhead Press', 3, 8, 12, 2),
          ex('Lat Pulldown', 3, 10, 12, 2),
          ex('EZ Bar Curl', 2, 10, 12, 3),
          ex('Tricep Extension', 2, 10, 12, 3),
        ],
      },
      {
        day: 'Day 2 — Lower A',
        exercises: [
          ex('Squat', 3, 6, 10, 2),
          ex('Romanian Deadlift', 3, 8, 12, 2),
          ex('Leg Press', 3, 10, 15, 2),
          ex('Lying Leg Curl', 2, 10, 12, 2),
          ex('Standing Calf Raise', 3, 12, 15, 3),
        ],
      },
      {
        day: 'Day 3 — Upper B',
        exercises: [
          ex('Incline Dumbbell Press', 3, 8, 12, 2),
          ex('Weighted Pull-Up or Pulldown', 3, 8, 12, 2),
          ex('Seated Dumbbell Press', 3, 8, 12, 2),
          ex('Chest-Supported Row', 3, 10, 12, 2),
          ex('Hammer Curl', 2, 10, 12, 3),
          ex('Skullcrusher', 2, 10, 12, 3),
        ],
      },
      {
        day: 'Day 4 — Lower B',
        exercises: [
          ex('Deadlift', 2, 5, 5, 2),
          ex('Hack Squat or Front Squat', 3, 8, 12, 2),
          ex('Bulgarian Split Squat', 2, 10, 12, 2),
          ex('Leg Extension', 2, 12, 15, 3),
          ex('Seated Calf Raise', 3, 12, 15, 3),
        ],
      },
    ],
  },
  {
    name: '5-Day Bro Split',
    weeks: 5,
    goal: 'Mass',
    days: [
      {
        day: 'Day 1 — Chest',
        exercises: [
          ex('Bench Press', 3, 6, 10, 2),
          ex('Incline Dumbbell Press', 3, 8, 12, 2),
          ex('Chest Dip', 3, 8, 15, 2),
          ex('Cable Crossover', 3, 12, 15, 2),
          ex('Machine Press', 1, 12, 20, 3, 'Burnout'),
        ],
      },
      {
        day: 'Day 2 — Back',
        exercises: [
          ex('Deadlift', 2, 5, 5, 2),
          ex('Weighted Pull-Up or Lat Pulldown', 3, 8, 12, 2),
          ex('Barbell Row', 3, 8, 12, 2),
          ex('Seated Cable Row', 3, 10, 12, 2),
          ex('Straight-Arm Pulldown', 2, 12, 15, 3),
        ],
      },
      {
        day: 'Day 3 — Shoulders',
        exercises: [
          ex('Seated Barbell Press', 3, 6, 10, 2),
          ex('Seated Arnold Press', 3, 8, 12, 2),
          ex('Dumbbell Lateral Raise', 3, 10, 15, 2),
          ex('Rear Delt Fly', 3, 12, 15, 3),
          ex('Barbell Shrug', 3, 10, 12, 2),
        ],
      },
      {
        day: 'Day 4 — Legs',
        exercises: [
          ex('Squat', 3, 6, 10, 2),
          ex('Romanian Deadlift', 3, 8, 12, 2),
          ex('Leg Press', 3, 10, 15, 2),
          ex('Lying Leg Curl', 3, 10, 12, 2),
          ex('Standing Calf Raise', 3, 12, 15, 3),
          ex('Seated Calf Raise', 2, 12, 15, 3),
        ],
      },
      {
        day: 'Day 5 — Arms',
        exercises: [
          ex('EZ Bar Curl', 3, 8, 12, 2),
          ex('Hammer Curl', 3, 10, 12, 3),
          ex('Preacher Curl', 2, 10, 12, 3),
          ex('Skullcrusher', 3, 8, 12, 2),
          ex('Tricep Pushdown', 3, 10, 12, 2),
          ex('Overhead Dumbbell Extension', 2, 10, 12, 3),
        ],
      },
    ],
  },
  {
    name: '6-Day Push / Pull / Legs ×2',
    weeks: 5,
    goal: 'Mass',
    days: [
      {
        day: 'Day 1 — Push A',
        exercises: [
          ex('Bench Press', 3, 6, 10, 2),
          ex('Overhead Press', 3, 8, 12, 2),
          ex('Incline Dumbbell Press', 3, 8, 12, 2),
          ex('Lateral Raise', 3, 12, 15, 2),
          ex('Tricep Pushdown', 3, 10, 12, 3),
        ],
      },
      {
        day: 'Day 2 — Pull A',
        exercises: [
          ex('Deadlift', 2, 5, 5, 2),
          ex('Weighted Pull-Up or Pulldown', 3, 6, 10, 2),
          ex('Barbell Row', 3, 8, 12, 2),
          ex('Face Pull', 3, 12, 15, 3),
          ex('EZ Bar Curl', 3, 8, 12, 2),
        ],
      },
      {
        day: 'Day 3 — Legs A',
        exercises: [
          ex('Squat', 3, 6, 10, 2),
          ex('Romanian Deadlift', 3, 8, 12, 2),
          ex('Leg Press', 3, 10, 15, 2),
          ex('Lying Leg Curl', 2, 10, 12, 2),
          ex('Standing Calf Raise', 4, 12, 15, 3),
        ],
      },
      {
        day: 'Day 4 — Push B',
        exercises: [
          ex('Overhead Press', 3, 6, 10, 2),
          ex('Incline Dumbbell Press', 3, 8, 12, 2),
          ex('Chest Dip', 3, 8, 15, 2),
          ex('Cable Lateral Raise', 3, 12, 15, 3),
          ex('Skullcrusher', 3, 8, 12, 2),
        ],
      },
      {
        day: 'Day 5 — Pull B',
        exercises: [
          ex('Barbell Row', 3, 6, 10, 2),
          ex('Lat Pulldown', 3, 10, 12, 2),
          ex('Chest-Supported Row', 3, 10, 12, 2),
          ex('Rear Delt Fly', 3, 12, 15, 3),
          ex('Hammer Curl', 3, 10, 12, 3),
        ],
      },
      {
        day: 'Day 6 — Legs B',
        exercises: [
          ex('Front Squat or Hack Squat', 3, 8, 12, 2),
          ex('Bulgarian Split Squat', 3, 10, 12, 2),
          ex('Stiff Leg Deadlift', 3, 10, 12, 2),
          ex('Leg Extension', 3, 12, 15, 3),
          ex('Seated Calf Raise', 4, 12, 15, 3),
        ],
      },
    ],
  },
]
