import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { DEFAULT_CHECKLIST } from '../../../lib/defaultChecklist'
import { localDateStr } from '../../../lib/dates'
import { goalCopy } from '../../../lib/phase'

function recoveryScore(r) {
  return r.sleep + r.energy + r.soreness + r.stress + r.digestion
}

export default function HomeScreen({
  profile,
  phase,
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
  const [items, setItems] = useState(DEFAULT_CHECKLIST)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [recoveryToday, setRecoveryToday] = useState(null)

  async function loadTodayCompletions(list) {
    // Load today's completions so checks persist across sessions/devices
    // (graceful if the checklist_completions table doesn't exist yet)
    try {
      const { data: done } = await supabase
        .from('checklist_completions').select('item_text')
        .eq('client_id', profile.id)
        .eq('completed_date', localDateStr())
      if (done) {
        const doneSet = new Set(done.map(r => r.item_text))
        const initial = {}
        list.forEach((text, i) => { if (doneSet.has(text)) initial[i] = true })
        setChecked(initial)
      }
    } catch { /* table missing — checks stay local-only */ }
  }

  useEffect(() => {
    async function loadChecklist() {
      if (!profile?.id) return
      const { data } = await supabase
        .from('checklist_items').select('text')
        .eq('client_id', profile.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      const list = data && data.length > 0 ? data.map(r => r.text) : DEFAULT_CHECKLIST
      setItems(list)
      loadTodayCompletions(list)
    }
    async function loadRecoveryToday() {
      if (!profile?.id) return
      try {
        const { data } = await supabase
          .from('client_recovery_logs')
          .select('sleep, energy, soreness, stress, digestion')
          .eq('client_id', profile.id)
          .eq('log_date', localDateStr())
          .maybeSingle()
        if (data) setRecoveryToday(data)
      } catch { /* table missing — show the no-check-in state */ }
    }
    loadChecklist()
    loadRecoveryToday()
  }, [profile?.id])

  async function handleReset() {
    if (resetting) return
    setResetting(true)
    setResetMsg('')
    setChecked({})
    if (profile?.id) {
      try {
        const { error } = await supabase
          .from('checklist_completions').delete()
          .eq('client_id', profile.id)
          .eq('completed_date', localDateStr())
        if (error) throw error
        setResetMsg('Checklist reset ✓')
      } catch {
        // DB delete failed — reload truth from the server so the UI
        // doesn't lie about what's checked.
        loadTodayCompletions(items)
        setResetMsg('Could not reset — check your connection and try again.')
      }
    }
    setResetting(false)
    setTimeout(() => setResetMsg(''), 3500)
  }

  async function toggleCheck(i) {
    const text = items[i]
    const willCheck = !checked[i]
    setChecked(c => ({ ...c, [i]: willCheck }))
    if (!profile?.id || !text) return
    try {
      if (willCheck) {
        await supabase.from('checklist_completions').upsert(
          { client_id: profile.id, item_text: text, completed_date: localDateStr() },
          { onConflict: 'client_id,item_text,completed_date' }
        )
      } else {
        await supabase.from('checklist_completions').delete()
          .eq('client_id', profile.id)
          .eq('item_text', text)
          .eq('completed_date', localDateStr())
      }
    } catch { /* optimistic UI already updated */ }
  }
  // Recovery ring — real data from today's check-in, honest empty state.
  const score = recoveryToday ? recoveryScore(recoveryToday) : null
  const scoreFrac = score !== null ? score / 25 : 0
  const circ = 2 * Math.PI * 38
  const offset = circ * (1 - scoreFrac)
  const ringColor = score === null ? 'var(--text3)' : score >= 20 ? 'var(--g)' : score >= 13 ? 'var(--a)' : 'var(--r)'
  const statusLabel = score === null ? 'No check-in' : score >= 20 ? 'Optimal' : score >= 13 ? 'Good' : 'Reduced'

  // Phase-aware goal block (replaces the old cut-assuming copy).
  const goal = goalCopy(phase, { startWeight, goalWeight, current: avg7 })

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

        {goalWeight && progressPct !== null && (
          <>
            <div className="v2-card-eyebrow" style={{ marginBottom: 4 }}>
              {goal.title}
            </div>
            <div className="v2-goal-track">
              <div className="v2-goal-fill" style={{ width: `${progressPct ?? 0}%` }} />
            </div>
            <div className="v2-goal-endpoints">
              <span>{startWeight ?? '—'} lbs</span>
              <span>{progressPct ? `${progressPct.toFixed(0)}%` : '0%'}</span>
              <span>{goalWeight} lbs</span>
            </div>
            {goal.sub && (
              <div className="v2-goal-remaining">{goal.sub}</div>
            )}
          </>
        )}
        {goalWeight && progressPct === null && goal.sub && (
          <>
            <div className="v2-card-eyebrow" style={{ marginBottom: 4 }}>
              {goal.title}
            </div>
            <div className="v2-goal-remaining">{goal.sub}</div>
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

      {/* Recovery snapshot — REAL DATA (today's check-in from client_recovery_logs) */}
      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Recovery Today</span>
        </div>
        {score === null ? (
          <div className="empty-state">No check-in yet today. Log yours from the Recovery tab.</div>
        ) : (
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
              <div className="v2-recovery-sub">
                {score >= 20 ? 'Take every set to failure today.' : 'Train smart — listen to your body today.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily checklist — coach-customizable via checklist_items table */}
      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Daily Checklist</span>
          <button className="btn-small" onClick={handleReset} disabled={resetting}>
            {resetting ? 'Resetting…' : 'Reset'}
          </button>
        </div>
        {resetMsg && (
          <div className={resetMsg.includes('Could not') ? 'error-text' : 'success-text'} style={{ marginBottom: 10 }}>
            {resetMsg}
          </div>
        )}
        {items.map((text, i) => (
          <div className="v2-check-row" key={i} onClick={() => toggleCheck(i)}>
            <div className={`v2-checkbox ${checked[i] ? 'done' : ''}`} />
            <div className={`v2-check-text ${checked[i] ? 'done' : ''}`}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
