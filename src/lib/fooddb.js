// ════════════════════════════════════════════════════════════
// FOOD DATABASE — USDA FoodData Central.
//
// Food search needs a free API key:
//   1. Get one at https://api.data.gov (API key signup, ~2 minutes)
//   2. Add it as VITE_USDA_API_KEY in Netlify:
//      Site settings → Environment variables → Add variable
//   3. Redeploy (or it picks up on the next push)
//
// Without the key, the search UI shows an honest "food search
// isn't connected yet" state and manual entry still works fully.
// ════════════════════════════════════════════════════════════

const API_KEY = import.meta.env.VITE_USDA_API_KEY || ''

export function foodSearchAvailable() {
  return Boolean(API_KEY)
}

function findNutrient(nutrients, names) {
  const n = (nutrients || []).find(x => names.includes(x.nutrientName))
  if (!n) return 0
  const v = Number(n.value) || 0
  // Some datasets report energy in kJ — normalize to kcal.
  if (names.includes('Energy') && (n.unitName || '').toLowerCase() === 'kj') return v / 4.184
  return v
}

function normalizeFood(f) {
  if (!f) return null
  const ns = f.foodNutrients || []
  return {
    fdcId: f.fdcId,
    name: f.description || 'Unknown food',
    brand: f.brandName || null,
    caloriesPer100g: findNutrient(ns, ['Energy']),
    proteinPer100g: findNutrient(ns, ['Protein']),
    carbsPer100g: findNutrient(ns, ['Carbohydrate, by difference', 'Carbohydrate']),
    fatPer100g: findNutrient(ns, ['Total lipid (fat)']),
    fiberPer100g: findNutrient(ns, ['Fiber, total dietary']),
  }
}

/**
 * Search USDA FoodData Central. Returns normalized foods, [] on any failure.
 */
export async function searchFoods(query) {
  const q = (query || '').trim()
  if (!q || !API_KEY) return []
  try {
    const params = new URLSearchParams({
      api_key: API_KEY,
      query: q,
      pageSize: '20',
      dataType: 'SR Legacy,Survey (FNDDS)',
    })
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.foods || []).map(normalizeFood).filter(Boolean)
  } catch {
    return []
  }
}

const round1 = v => Math.round(v * 10) / 10

/**
 * Scale a food's per-100g macros to a gram amount.
 */
export function scaleMacros(food, grams) {
  const g = Number(grams) || 0
  const k = g / 100
  return {
    calories: round1((Number(food.caloriesPer100g) || 0) * k),
    protein_g: round1((Number(food.proteinPer100g) || 0) * k),
    carbs_g: round1((Number(food.carbsPer100g) || 0) * k),
    fat_g: round1((Number(food.fatPer100g) || 0) * k),
    fiber_g: round1((Number(food.fiberPer100g) || 0) * k),
  }
}

export function gramsFromOz(oz) {
  return round1((Number(oz) || 0) * 28.3495)
}

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
export const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }
