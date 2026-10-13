// Recovery-log reconciliation.
//
// The client app logs to `client_recovery_logs` (5 sliders, /25) while the
// coach dashboard historically read `coach_recovery_logs` (6 metrics
// including motivation, /30) — so the coach never saw the client's own
// check-ins. There is no migration unifying the tables and existing rows
// must keep their meaning, so the reconciliation happens here in code:
//
// - `recPct(r)` normalizes ANY recovery row to a 0–100 score using
//   whichever of the 6 metrics are present (never fabricates a missing
//   motivation value).
// - `mergeRecLogs(coachLogs, clientLogs)` merges both tables by date.
//   A coach-entered row wins ties because it carries the extra metric.

const SHARED_METRICS = ['sleep', 'energy', 'soreness', 'stress', 'digestion']

/** 0–100 normalized score, or null when the row has no usable metrics. */
export function recPct(r) {
  if (!r) return null
  const keys = [...SHARED_METRICS, 'motivation'].filter(
    (k) => typeof r[k] === 'number' && isFinite(r[k])
  )
  if (!keys.length) return null
  return (keys.reduce((a, k) => a + r[k], 0) / (keys.length * 5)) * 100
}

/**
 * Merge coach + client recovery logs newest-first, deduplicated by
 * log_date. Each returned row carries `_src: 'coach' | 'client'`.
 */
export function mergeRecLogs(coachLogs, clientLogs) {
  const byDate = new Map()
  for (const r of (clientLogs || []).filter(Boolean)) {
    if (r?.log_date) byDate.set(r.log_date, { ...r, _src: 'client' })
  }
  // Coach-entered rows win ties — they carry the extra motivation metric.
  for (const r of (coachLogs || []).filter(Boolean)) {
    if (r?.log_date) byDate.set(r.log_date, { ...r, _src: 'coach' })
  }
  return [...byDate.values()].sort((a, b) => b.log_date.localeCompare(a.log_date))
}

/** Mean recPct over rows, or null. */
export function avgRecPct(rows) {
  const pcts = (rows || []).map(recPct).filter((p) => p !== null)
  if (!pcts.length) return null
  return pcts.reduce((a, b) => a + b, 0) / pcts.length
}
