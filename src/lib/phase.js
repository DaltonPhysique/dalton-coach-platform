// Phase-aware metrics — single source of truth for how weight/progress
// numbers are interpreted per client phase.
//
// Phases come from a signup dropdown (Cut / Recomp / Lean Bulk /
// Maintenance) but the coach stats form is free text, so normalize
// defensively: match on keywords, case-insensitive.

/** 'cut' | 'recomp' | 'bulk' | 'maintenance' */
export function normalizePhase(phase) {
  const p = (phase || '').toLowerCase()
  if (p.includes('bulk')) return 'bulk'
  if (p.includes('recomp')) return 'recomp'
  if (p.includes('maint')) return 'maintenance'
  if (p.includes('cut')) return 'cut'
  return 'cut' // historical default
}

function clampPct(x) {
  return Math.min(100, Math.max(0, x))
}

/**
 * Progress from start toward goal as a 0–100 number, or null when the
 * number would be meaningless (missing values, or start === goal as in
 * Maintenance/Recomp where there is no distance to measure — the old
 * code divided by zero here and produced NaN).
 *
 * Works in both directions: cut (goal < start) and bulk (goal > start),
 * because progress is measured as movement from start toward goal.
 */
export function progressPctOf(startWeight, goalWeight, current) {
  const s = Number(startWeight)
  const g = Number(goalWeight)
  if (!s || !g || s === g) return null
  // Explicit null check FIRST — Number(null) is 0 and isFinite(null) is
  // true, which would silently produce a fake 0-based progress.
  if (current === null || current === undefined || current === '') return null
  const c = Number(current)
  if (!isFinite(c)) return null
  return clampPct(((c - s) / (g - s)) * 100)
}

/**
 * Color for a weight delta (weekly Δ, per-entry Δ) given the phase.
 * Cut: loss is good. Bulk: gain is good. Recomp/Maintenance: stability
 * is the goal — small moves read green, bigger swings amber.
 */
export function deltaColor(delta, phase) {
  if (delta === null || delta === undefined) return 'var(--text3)'
  const p = normalizePhase(phase)
  if (p === 'cut') return delta <= 0 ? 'var(--g)' : 'var(--r)'
  if (p === 'bulk') return delta >= 0 ? 'var(--g)' : 'var(--r)'
  return Math.abs(delta) <= 0.5 ? 'var(--g)' : 'var(--a)'
}

/** Phase-aware label for the lifetime net-change stat. */
export function netChangeLabel(phase) {
  const p = normalizePhase(phase)
  if (p === 'bulk') return 'Total Gained'
  if (p === 'cut') return 'Total Lost'
  return 'Net Change'
}

/**
 * Copy for the goal block on the client home screen, per phase.
 * Returns { title, sub } — sub may be null.
 */
export function goalCopy(phase, { startWeight, goalWeight, current } = {}) {
  const p = normalizePhase(phase)
  const g = Number(goalWeight)
  // Explicit null check first — isFinite(null) is true (null → 0).
  const hasCurrent = current !== null && current !== undefined && current !== '' && isFinite(Number(current))
  const c = hasCurrent ? Number(current) : null
  if (p === 'bulk' && g && c !== null) {
    const toGo = Math.max(0, g - c)
    return {
      title: `Bulk target — ${g} lbs`,
      sub: toGo > 0 ? `${toGo.toFixed(1)} lbs to go — keep gaining` : 'Target hit — talk to your coach about next steps',
    }
  }
  if (p === 'recomp') {
    return {
      title: 'Recomposition',
      sub: c !== null ? `Holding ${c.toFixed(1)} lbs — goal is strength up, waist down` : 'Goal is strength up, waist down — the scale staying flat is the plan',
    }
  }
  if (p === 'maintenance') {
    return {
      title: 'Maintenance',
      sub: c !== null ? `Holding ${c.toFixed(1)} lbs — stay within ±2 lbs` : 'Stay within ±2 lbs of your set point',
    }
  }
  // cut (default)
  if (g) {
    return {
      title: `Phase goal — ${g} lbs`,
      sub: c !== null ? `${Math.max(0, c - g).toFixed(1)} lbs to goal` : null,
    }
  }
  return { title: 'Phase goal', sub: null }
}

/** Should the "weight stalled" alert fire for this phase? Only when
 *  movement is actually expected (cut / bulk). */
export function expectsWeightMovement(phase) {
  const p = normalizePhase(phase)
  return p === 'cut' || p === 'bulk'
}
