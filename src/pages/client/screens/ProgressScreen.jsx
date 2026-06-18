import { useState } from 'react'
import { DEMO_PRS, DEMO_CHECKIN_HISTORY, DEMO_COUNTDOWN } from '../demoData'
import DemoBadge from '../components/DemoBadge'

export default function ProgressScreen({
  weights,
  avg7,
  weightInput,
  setWeightInput,
  weightBusy,
  onLogWeight,
}) {
  const [tab, setTab] = useState('weight')

  const totalLost = weights.length
    ? (weights[weights.length - 1]?.weight - weights[0]?.weight) * -1
    : null
  // weights is newest-first from the query; compute lost relative to oldest entry shown
  const oldest = weights[weights.length - 1]
  const newest = weights[0]
  const lost = oldest && newest ? (Number(oldest.weight) - Number(newest.weight)) : null

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
              <div className="stat-label">Total Lost</div>
              <div className="stat-value" style={{ color: lost > 0 ? 'var(--g)' : undefined }}>
                {lost !== null ? `${lost.toFixed(1)} lbs` : '—'}
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
          <DemoBadge label="Demo data — PR tracker not yet connected" />
          {DEMO_PRS.map((pr, i) => (
            <div className="v2-entry-card" key={i}>
              <div className="v2-entry-top">
                <span className="v2-entry-date">{pr.date}</span>
                <span className="v2-entry-tag upper">{pr.tag}</span>
              </div>
              <div className="v2-entry-name">{pr.exercise}</div>
              <div className="v2-entry-meta">{pr.detail}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'checkin' && (
        <div className="card">
          <DemoBadge label="Demo data — weekly check-in not yet connected" />
          {DEMO_CHECKIN_HISTORY.map((c, i) => (
            <div key={i}>
              <div className="v2-card-eyebrow" style={{ marginBottom: 10 }}>{c.week}</div>
              <div className="log-list">
                <div className="log-row"><span className="date">Training</span><span className="val">{'⭐'.repeat(c.training)}</span></div>
                <div className="log-row"><span className="date">Nutrition</span><span className="val">{'⭐'.repeat(c.nutrition)}</span></div>
                <div className="log-row"><span className="date">Sleep</span><span className="val">{'⭐'.repeat(c.sleep)}</span></div>
                <div className="log-row"><span className="date">Feeling</span><span className="val">{'⭐'.repeat(c.feeling)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'countdown' && (
        <div className="card">
          <DemoBadge label="Demo data — countdown not yet connected to live goal math" />
          <div className="v2-card-eyebrow">Remaining to Phase 1 Goal</div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1.5px', margin: '8px 0' }}>
            {DEMO_COUNTDOWN.remainingLbs}<span style={{ fontSize: 20, color: 'var(--text3)', fontWeight: 500 }}> lbs</span>
          </div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Weeks @ 1/wk</div>
              <div className="stat-value">{DEMO_COUNTDOWN.weeksAtOnePerWeek}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Est. Arrival</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{DEMO_COUNTDOWN.estimatedDate}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
