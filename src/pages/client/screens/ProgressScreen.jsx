import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { localDateStr } from '../../../lib/dates'
import { normalizePhase, netChangeLabel } from '../../../lib/phase'

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProgressScreen({
  profile,
  weights,
  avg7,
  phase,
  goalWeight,
  startWeight,
  weightInput,
  setWeightInput,
  weightBusy,
  onLogWeight,
}) {
  const [tab, setTab] = useState('weight')
  const [prs, setPrs] = useState([])
  const [prsLoading, setPrsLoading] = useState(true)

  useEffect(() => {
    async function loadPrs() {
      if (!profile?.id) { setPrsLoading(false); return }
      try {
        const { data } = await supabase
          .from('client_pr_logs')
          .select('id, log_date, session, exercise, set1, set2, notes')
          .eq('client_id', profile.id)
          .order('log_date', { ascending: false })
          .limit(20)
        setPrs(data || [])
      } catch {
        setPrs([]) // table missing — honest empty state below
      } finally {
        setPrsLoading(false)
      }
    }
    loadPrs()
  }, [profile?.id])

  // weights is newest-first from the query.
  const oldest = weights[weights.length - 1]
  const newest = weights[0]
  const recentDelta = oldest && newest ? Number(oldest.weight) - Number(newest.weight) : null
  // True lifetime change off start_weight when we have it (the old code
  // only looked at the last 14 logged entries and called it "Total Lost").
  const lifetimeDelta = startWeight && newest
    ? Number(startWeight) - Number(newest.weight)
    : recentDelta
  const netLabel = netChangeLabel(phase)
  const p = normalizePhase(phase)
  const netVal = lifetimeDelta
  // In a cut, loss (positive delta) is good; in a bulk, gain (negative
  // delta) is good; recomp/maintenance read neutral unless the swing is big.
  const netColor = netVal === null ? undefined
    : p === 'cut' ? (netVal > 0 ? 'var(--g)' : netVal < 0 ? 'var(--r)' : undefined)
    : p === 'bulk' ? (netVal < 0 ? 'var(--g)' : netVal > 0 ? 'var(--r)' : undefined)
    : Math.abs(netVal) <= 2 ? undefined : 'var(--a)'

  // ── Countdown: real goal math, phase-aware ──────────────────────────
  const g = Number(goalWeight)
  const c = avg7
  let countdown = null
  if (g && c) {
    if (p === 'recomp' || p === 'maintenance') {
      countdown = { mode: 'hold' }
    } else {
      const remaining = p === 'bulk' ? Math.max(0, g - c) : Math.max(0, c - g)
      const weeks = Math.ceil(remaining) // ~1 lb/week pace
      const arrival = new Date()
      arrival.setDate(arrival.getDate() + weeks * 7)
      countdown = {
        mode: 'goal',
        remaining: remaining.toFixed(1),
        weeks,
        arrival: arrival.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      }
    }
  }

  return (
    <div>
      <div className="v2-page-title">Progress</div>
      <div className="v2-page-sub">Weight · PRs · Weekly check-in</div>

      <div className="v2-subtabs">
        <button className={`v2-subtab ${tab === 'weight' ? 'active' : ''}`} onClick={() => setTab('weight')}>Weight</button>
        <button className={`v2-subtab ${tab === 'prs' ? 'active' : ''}`} onClick={() => setTab('prs')}>PRs</button>
        <button className={`v2-subtab ${tab === 'checkin' ? 'active' : ''}`} onClick={() => setTab('checkin')}>Check-In</button>
        <button className={`v2-subtab ${tab === 'countdown' ? 'active' : ''}`} onClick={() => setTab('countdown')}>Countdown</button>
      </div>

      {tab === 'weight' && (
        <>
          <div className="card">
            <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Log Weight</div>
            <form onSubmit={onLogWeight} className="weight-row">
              <input
                type="number"
                step="0.1"
                placeholder="231.0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <button className="btn-small" type="submit" disabled={weightBusy} style={{ flexShrink: 0 }}>
                {weightBusy ? 'Logging…' : 'Log'}
              </button>
            </form>
            <div className="muted">Post-void, pre-coffee. Same time every day.</div>
          </div>

          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">7-Day Avg</div>
              <div className="stat-value">{avg7 ? avg7.toFixed(1) : '—'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{netLabel}</div>
              <div className="stat-value" style={{ color: netColor }}>
                {netVal !== null ? `${Math.abs(netVal).toFixed(1)} lbs` : '—'}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="v2-card-eyebrow" style={{ marginBottom: 12 }}>Weight Log</div>
            <div className="log-list">
              {weights.length === 0 && <div className="empty-state">No weigh-ins yet.</div>}
              {weights.map((w) => (
                <div className="log-row" key={w.id}>
                  <span className="date">{w.log_date}</span>
                  <span className="val">{Number(w.weight).toFixed(1)} lbs</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'prs' && (
        <div className="card">
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Personal Records</div>
          {prsLoading ? (
            <div className="empty-state">Loading…</div>
          ) : prs.length === 0 ? (
            <div className="empty-state">No PRs logged yet. Log them from the Log tab.</div>
          ) : (
            prs.map((pr) => (
              <div className="v2-entry-card" key={pr.id}>
                <div className="v2-entry-top">
                  <span className="v2-entry-date">{fmtDate(pr.log_date)}</span>
                  {pr.session && <span className="v2-entry-tag upper">{pr.session}</span>}
                </div>
                <div className="v2-entry-name">{pr.exercise}</div>
                <div className="v2-entry-meta">
                  {[pr.set1, pr.set2].filter(Boolean).join(' · ')}
                  {pr.notes ? ` — ${pr.notes}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'checkin' && (
        <div className="card">
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Weekly Check-In</div>
          <div className="empty-state">
            Weekly check-ins live here once your coach sets them up. Your daily
            weigh-ins, recovery scores, and checklist are already feeding your
            coach's dashboard.
          </div>
        </div>
      )}

      {tab === 'countdown' && (
        <div className="card">
          {!countdown ? (
            <>
              <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Countdown</div>
              <div className="empty-state">No goal set yet — your coach will set your phase target.</div>
            </>
          ) : countdown.mode === 'hold' ? (
            <>
              <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>
                {p === 'recomp' ? 'Recomposition' : 'Maintenance'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6 }}>
                The scale staying flat is the plan.
                {c ? <> You're holding <span style={{ color: 'var(--g)' }}>{c.toFixed(1)} lbs</span>.</> : null}
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                {p === 'recomp'
                  ? 'Progress shows up in strength, photos, and measurements — not the scale.'
                  : 'Stay within ±2 lbs of your set point and you\'re winning.'}
              </p>
            </>
          ) : (
            <>
              <div className="v2-card-eyebrow">
                {p === 'bulk' ? 'Remaining to Bulk Target' : 'Remaining to Phase Goal'}
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', margin: '8px 0' }}>
                {countdown.remaining}<span style={{ fontSize: 20, color: 'var(--text3)', fontWeight: 500 }}> lbs</span>
              </div>
              <div className="stat-grid">
                <div className="stat-box">
                  <div className="stat-label">Weeks @ ~1/wk</div>
                  <div className="stat-value">{countdown.weeks}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Est. Arrival</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{countdown.arrival}</div>
                </div>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                Based on your 7-day average of {c.toFixed(1)} lbs as of {localDateStr()}.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
