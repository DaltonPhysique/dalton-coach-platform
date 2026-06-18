import { useState } from 'react'
import { DEMO_RECOVERY_TODAY } from '../demoData'

const CHECKLIST_ITEMS = [
  'Black coffee — cortisol prime',
  'Weigh in (post-void, pre-coffee) + log weight',
  'Score daily recovery (sleep, energy, soreness)',
  'Meal 1 — protein + carbs',
  'Pre-training carbs hit',
  'Post-workout shake',
  'Dinner logged',
  'Hit 220g protein for the day',
  'Magnesium + Zinc before bed',
]

function recoveryScore(r) {
  return r.sleep + r.energy + r.soreness + r.stress + r.digestion
}

export default function HomeScreen({
  profile,
  latest,
  avg7,
  goalWeight,
  startWeight,
  progressPct,
  nutritionPlan,
  dayType,
  setDayType,
}) {
  const [checked, setChecked] = useState({})
  const score = recoveryScore(DEMO_RECOVERY_TODAY)
  const scoreFrac = score / 25
  const circ = 2 * Math.PI * 38
  const offset = circ * (1 - scoreFrac)
  const ringColor = score >= 20 ? 'var(--g)' : score >= 13 ? 'var(--a)' : 'var(--r)'
  const statusLabel = score >= 20 ? 'Optimal' : score >= 13 ? 'Good' : 'Reduced'

  const remaining = goalWeight && avg7 ? Math.max(0, avg7 - goalWeight).toFixed(1) : null

  return (
    <div>
      {/* Weight hero — REAL DATA */}
      <div className="card">
        <div className="v2-weight-hero-row">
          <div>
            <div className="v2-weight-big">
              {latest ? Number(latest.weight).toFixed(1) : '—'}
              <span className="v2-weight-unit"> lbs</span>
            </div>
            <div className="v2-weight-date">
              {latest ? latest.log_date : 'No weigh-in yet'}
            </div>
          </div>
          <div>
            <div className="v2-avg-big">{avg7 ? avg7.toFixed(1) : '—'}</div>
            <div className="v2-avg-label">7-day avg</div>
          </div>
        </div>

        {goalWeight && (
          <>
            <div className="v2-card-eyebrow" style={{ marginBottom: 4 }}>
              Phase 1 goal — {goalWeight} lbs
            </div>
            <div className="v2-goal-track">
              <div className="v2-goal-fill" style={{ width: `${progressPct ?? 0}%` }} />
            </div>
            <div className="v2-goal-endpoints">
              <span>{startWeight ?? '—'} lbs</span>
              <span>{progressPct ? `${progressPct.toFixed(0)}%` : '0%'}</span>
              <span>{goalWeight} lbs</span>
            </div>
            {remaining !== null && (
              <div className="v2-goal-remaining">{remaining} lbs to goal</div>
            )}
          </>
        )}
      </div>

      {/* Today's targets — REAL DATA (from nutrition_plans) */}
      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Today's Targets</span>
          <div className="v2-daytoggle">
            <button className={dayType === 'training' ? 'active' : ''} onClick={() => setDayType('training')}>Training</button>
            <button className={dayType === 'rest' ? 'active' : ''} onClick={() => setDayType('rest')}>Rest</button>
          </div>
        </div>
        {!nutritionPlan && (
          <div className="empty-state">Your coach hasn't assigned a nutrition plan yet.</div>
        )}
        {nutritionPlan && (
          <div className="v2-macro-grid">
            <div className="v2-macro-box">
              <div className="value">{dayType === 'training' ? nutritionPlan.training_cal : nutritionPlan.rest_cal}</div>
              <div className="label">kcal</div>
            </div>
            <div className="v2-macro-box">
              <div className="value" style={{ color: 'var(--v2)' }}>
                {dayType === 'training' ? nutritionPlan.training_protein : nutritionPlan.rest_protein}<span className="sub">g</span>
              </div>
              <div className="label">protein</div>
            </div>
            <div className="v2-macro-box">
              <div className="value" style={{ color: 'var(--g)' }}>
                {dayType === 'training' ? nutritionPlan.training_carbs : nutritionPlan.rest_carbs}<span className="sub">g</span>
              </div>
              <div className="label">carbs</div>
            </div>
            <div className="v2-macro-box">
              <div className="value" style={{ color: 'var(--a)' }}>
                {dayType === 'training' ? nutritionPlan.training_fat : nutritionPlan.rest_fat}<span className="sub">g</span>
              </div>
              <div className="label">fat</div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery snapshot — DEMO DATA (no recovery_logs table yet) */}
      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Recovery Today</span>
          <button className="btn-small">Log</button>
        </div>
        <div className="v2-demo-badge">Demo data — recovery tracking not yet connected</div>
        <div className="v2-recovery-row">
          <div className="v2-ring-wrap">
            <svg viewBox="0 0 86 86">
              <circle className="v2-ring-track" cx="43" cy="43" r="38" />
              <circle
                className="v2-ring-fill"
                cx="43" cy="43" r="38"
                stroke={ringColor}
                strokeDasharray={circ.toFixed(1)}
                strokeDashoffset={offset.toFixed(1)}
              />
            </svg>
            <div className="v2-ring-label">
              <span className="v2-ring-num" style={{ color: ringColor }}>{score}</span>
              <span className="v2-ring-den">/25</span>
            </div>
          </div>
          <div>
            <div className="v2-recovery-status" style={{ color: ringColor }}>{statusLabel}</div>
            <div className="v2-recovery-sub">Take every set to failure today.</div>
            <div className="v2-recovery-warning">⚠ Check hormone signals</div>
          </div>
        </div>
      </div>

      {/* Daily checklist — DEMO/local only, not backed by a table */}
      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Daily Checklist</span>
          <button className="btn-small" onClick={() => setChecked({})}>Reset</button>
        </div>
        {CHECKLIST_ITEMS.map((text, i) => (
          <div className="v2-check-row" key={i} onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}>
            <div className={`v2-checkbox ${checked[i] ? 'done' : ''}`} />
            <div className={`v2-check-text ${checked[i] ? 'done' : ''}`}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
