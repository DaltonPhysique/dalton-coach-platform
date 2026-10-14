import { useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { localDateStr } from '../../../lib/dates'
import {
  weekNumber, isDeloadWeek, prescriptionFor, weeklyVolumes,
  sessionDays, logsByExercise,
} from '../../../lib/mesocycle'

// ════════════════════════════════════════════════════════════
// MESOCYCLE TRAIN VIEW — RP-style session logging.
//
// Rendered by TrainScreen when the client has an active mesocycle.
// Each exercise shows its computed prescription (sets × rep range
// @ target RIR + weight from last week's logs) and the client logs
// each set with one tap. Final week auto-deloads.
// ════════════════════════════════════════════════════════════

const NOTE_LABEL = {
  start: 'starting weight',
  progressed: 'earned the bump ↑',
  micro: '+2.5',
  repeat: 'repeat weight',
  deload: 'deload',
}

function SetRow({ sKey, prescription, existing, onLog, busy }) {
  const [weight, setWeight] = useState(String(prescription.weight))
  const [reps, setReps] = useState(String(prescription.repMax))
  const [rir, setRir] = useState(prescription.targetRir)

  if (existing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderTop: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--g)', fontWeight: 800, fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{existing.weight} lb × {existing.reps}</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>@ RIR {existing.rir}</span>
      </div>
    )
  }

  const inputStyle = {
    fontSize: 16, padding: '10px 6px', borderRadius: 10, border: '1px solid var(--border2)',
    background: 'var(--bg)', color: 'var(--text)', width: '100%', textAlign: 'center', minHeight: 44,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, padding: '10px 4px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.6px', color: 'var(--text3)', textAlign: 'center', marginBottom: 3 }}>LB</div>
        <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} style={inputStyle} aria-label="Weight" />
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.6px', color: 'var(--text3)', textAlign: 'center', marginBottom: 3 }}>REPS</div>
        <input type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} style={inputStyle} aria-label="Reps" />
      </div>
      <div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.6px', color: 'var(--text3)', textAlign: 'center', marginBottom: 3 }}>RIR</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <button type="button" onClick={() => setRir(r => Math.max(0, r - 1))}
            style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg4)', color: 'var(--text)', fontSize: 18, fontWeight: 800 }} aria-label="Decrease RIR">−</button>
          <span style={{ fontSize: 17, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{rir}</span>
          <button type="button" onClick={() => setRir(r => Math.min(10, r + 1))}
            style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg4)', color: 'var(--text)', fontSize: 18, fontWeight: 800 }} aria-label="Increase RIR">+</button>
        </div>
      </div>
      <button type="button" className="btn-primary" disabled={busy}
        onClick={() => onLog(sKey, { weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0, rir })}
        style={{ minHeight: 44, padding: '0 18px', fontSize: 14 }}>
        {busy ? '…' : 'Log'}
      </button>
    </div>
  )
}

export default function MesocycleTrainView({ profile, mesocycle, templateExercises, setLogs, onLogsChanged }) {
  const [activeDay, setActiveDay] = useState(0)
  const [logBusy, setLogBusy] = useState(null)
  const [error, setError] = useState('')

  const week = useMemo(
    () => weekNumber(mesocycle.start_date, localDateStr()),
    [mesocycle.start_date]
  )
  const totalWeeks = mesocycle.template_weeks
  const deload = isDeloadWeek(week, totalWeeks)
  const done = week > totalWeeks

  const days = useMemo(() => sessionDays(templateExercises), [templateExercises])
  const byExercise = useMemo(() => logsByExercise(setLogs), [setLogs])
  const volumes = useMemo(() => weeklyVolumes(setLogs), [setLogs])
  const maxVol = Math.max(1, ...volumes.map(v => v.volume))

  const day = days[activeDay]
  const dayExercises = useMemo(
    () => (templateExercises || []).filter(e => e.session_day === day),
    [templateExercises, day]
  )

  // prescription per exercise for THIS week, from LAST week's logs
  const prescriptions = useMemo(() => {
    const out = {}
    for (const ex of dayExercises) {
      const lastWeek = (byExercise[ex.exercise] || []).filter(s => Number(s.week_number) === week - 1)
      out[ex.id] = prescriptionFor(ex, week, totalWeeks, lastWeek)
    }
    return out
  }, [dayExercises, byExercise, week, totalWeeks])

  const loggedKey = (exName, setNum) => `${week}|${day}|${exName}|${setNum}`
  const loggedMap = useMemo(() => {
    const m = {}
    for (const s of setLogs || []) {
      if (Number(s.week_number) === week && s.session_day === day) {
        m[`${s.week_number}|${s.session_day}|${s.exercise}|${s.set_number}`] = s
      }
    }
    return m
  }, [setLogs, week, day])

  async function logSet(sKey, ex, setNum, vals) {
    if (vals.weight < 0 || vals.reps < 0) return
    setLogBusy(sKey); setError('')
    const { error } = await supabase.from('set_logs').upsert({
      client_id: profile.id,
      mesocycle_id: mesocycle.id,
      week_number: week,
      log_date: localDateStr(),
      session_day: day,
      exercise: ex.exercise,
      set_number: setNum,
      weight: vals.weight,
      reps: vals.reps,
      rir: vals.rir,
    }, { onConflict: 'client_id,mesocycle_id,week_number,session_day,exercise,set_number' })
    setLogBusy(null)
    if (error) { setError('Couldn\'t save that set — check your connection and try again.'); return }
    onLogsChanged()
  }

  if (done) {
    return (
      <div>
        <div className="v2-page-title">Training</div>
        <div className="card"><div className="empty-state">
          <div className="icon">🏁</div>
          Mesocycle complete. Nice work — ask your coach for the next block.
        </div></div>
      </div>
    )
  }

  return (
    <div>
      <div className="v2-page-title">Training</div>

      {/* ── mesocycle header ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{mesocycle.template_name}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: deload ? 'var(--g2)' : 'var(--v2)' }}>
            Week {week} of {totalWeeks}
          </div>
        </div>

        {/* volume trend */}
        {volumes.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', color: 'var(--text3)', marginBottom: 6 }}>VOLUME / WEEK (LB)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
              {volumes.map(v => (
                <div key={v.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', borderRadius: 6,
                    height: Math.max(6, (v.volume / maxVol) * 48),
                    background: v.week === week ? 'var(--v)' : 'var(--bg4)',
                    border: '1px solid var(--border2)',
                  }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>W{v.week}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!deload && week < totalWeeks && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text2)' }}>
            Deload in {totalWeeks - week} week{totalWeeks - week === 1 ? '' : 's'} — keep pushing.
          </div>
        )}
      </div>

      {deload && (
        <div style={{ background: 'var(--gbg)', border: '1px solid var(--gbrd)', borderRadius: 14, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--g)' }}>Deload week — trust it.</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Light work, no grinding. This is where the gains lock in.</div>
        </div>
      )}

      {/* ── session day tabs ── */}
      {days.length > 1 && (
        <div className="v2-subtabs" style={{ marginBottom: 12 }}>
          {days.map((d, i) => (
            <button key={d} className={`v2-subtab ${i === activeDay ? 'active' : ''}`} onClick={() => setActiveDay(i)}>
              {d}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── exercises ── */}
      {dayExercises.map(ex => {
        const rx = prescriptions[ex.id]
        return (
          <div key={ex.id} className="card" style={{ marginBottom: 12 }}>
            <div className="v2-ex-name" style={{ marginBottom: 2 }}>{ex.exercise}</div>
            <div className="v2-ex-meta" style={{ marginBottom: 6 }}>
              {rx.sets} × {rx.repMin}–{rx.repMax} @ RIR {rx.targetRir} · {rx.weight} lb
              <span style={{ color: rx.note === 'progressed' ? 'var(--g)' : 'var(--text3)', fontWeight: 700 }}>
                {' '}· {NOTE_LABEL[rx.note]}
              </span>
            </div>
            {ex.notes && (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 6 }}>{ex.notes}</div>
            )}
            {Array.from({ length: rx.sets }, (_, i) => {
              const setNum = i + 1
              const key = loggedKey(ex.exercise, setNum)
              return (
                <SetRow key={key} sKey={key} prescription={rx}
                  existing={loggedMap[key]}
                  busy={logBusy === key}
                  onLog={(k, vals) => logSet(k, ex, setNum, vals)} />
              )
            })}
          </div>
        )
      })}

      {dayExercises.length === 0 && (
        <div className="card"><div className="empty-state">
          <div className="icon">🏋️</div>
          No exercises programmed for this day yet.
        </div></div>
      )}
    </div>
  )
}
