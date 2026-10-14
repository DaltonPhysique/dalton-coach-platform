// ════════════════════════════════════════════════════════════
// BASE NUTRITION TEMPLATES — one-tap macro presets for the coach.
//
// Each template has one macro row per day type (rest / training /
// legs). "Use this template" on the Nutrition page clones one of
// these into nutrition_templates + nutrition_template_days, then
// opens it for editing — every number is tweakable.
// ════════════════════════════════════════════════════════════

const day = (calories, protein_g, carbs_g, fat_g, fiber_g = 30) => ({
  calories, protein_g, carbs_g, fat_g, fiber_g,
})

export const BASE_NUTRITION = [
  {
    name: 'Aggressive Cut',
    goal: 'Fat loss',
    notes: 'Steep deficit. Protein stays high to protect muscle.',
    days: {
      rest:     day(2000, 200, 155, 65),
      training: day(2200, 200, 205, 65),
      legs:     day(2400, 200, 245, 70),
    },
  },
  {
    name: 'Moderate Cut',
    goal: 'Fat loss',
    notes: 'Sustainable deficit most clients can run for 12+ weeks.',
    days: {
      rest:     day(2200, 200, 195, 70),
      training: day(2500, 210, 240, 75),
      legs:     day(2700, 210, 280, 80),
    },
  },
  {
    name: 'Recomp',
    goal: 'Recomp',
    notes: 'Near maintenance. Lose fat and build muscle slowly.',
    days: {
      rest:     day(2400, 200, 230, 75),
      training: day(2700, 210, 285, 80),
      legs:     day(2900, 210, 320, 85),
    },
  },
  {
    name: 'Lean Bulk',
    goal: 'Mass',
    notes: 'Small surplus. Extra fuel lands on training days.',
    days: {
      rest:     day(2600, 200, 270, 80),
      training: day(3000, 210, 350, 85),
      legs:     day(3200, 220, 380, 90),
    },
  },
]
