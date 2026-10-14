import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import MesocycleTrainView from './MesocycleTrainView'

// Train tab: mesocycle-driven when the client has an active mesocycle,
// otherwise the classic training-plan (split_json) display.

export default function TrainScreen({ trainingPlan, profile }) {
  const [meso, setMeso] = useState(null)       // { id, start_date, template_name, template_weeks }
  const [tex, setTex] = useState([])           // template_exercises rows
  const [setLogs, setSetLogs] = useState([])   // this mesocycle's set_logs
  const [mesoChecked, setMesoChecked] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [activeDay, setActiveDay] = useState(0) // classic fallback day tabs

  useEffect(() => {
    if (profile?.id) loadMesocycle()
  }, [profile?.id])

  async function loadMesocycle() {
    // Active mesocycle for this client (graceful when tables don't exist yet)
    let mc = null
    try {
      const { data, error } = await supabase
        .from('client_mesocycles')
        .select('id, start_date, status, template_id')
        .eq('client_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      mc = data
    } catch (e) {
      console.error('mesocycle load failed:', e?.message)
      setLoadError(e?.message || 'query failed')
      setMesoChecked(true)
      return
    }
    if (!mc) { setMesoChecked(true); return }

    const [{ data: tpl }, { data: exs }] = await Promise.all([
      supabase.from('mesocycle_templates').select('name, weeks').eq('id', mc.template_id).maybeSingle(),
      supabase.from('template_exercises').select('*').eq('template_id', mc.template_id).order('sort_order'),
    ])
    const { data: logs } = await supabase
      .from('set_logs').select('*').eq('mesocycle_id', mc.id).order('log_date', { ascending: true })

    setMeso({ ...mc, template_name: tpl?.name || 'Mesocycle', template_weeks: tpl?.weeks || 4 })
    setTex(exs || [])
    setSetLogs(logs || [])
    setMesoChecked(true)
  }

  async function reloadLogs() {
    if (!meso) return
    const { data } = await supabase
      .from('set_logs').select('*').eq('mesocycle_id', meso.id).order('log_date', { ascending: true })
    setSetLogs(data || [])
  }

  // Still checking → keep it quiet, don't flash the wrong view
  if (!mesoChecked) {
    return <div><div className="v2-page-title">Training</div><div className="card"><div className="empty-state">Loading…</div></div></div>
  }

  if (meso) {
    return (
      <MesocycleTrainView
        profile={profile}
        mesocycle={meso}
        templateExercises={tex}
        setLogs={setLogs}
        onLogsChanged={reloadLogs}
      />
    )
  }

  // ── classic fallback (unchanged) ──
  const days = trainingPlan?.split_json || []

  return (
    <div>
      <div className="v2-page-title">Training</div>

      {!trainingPlan && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🏋️</div>
            Your coach hasn't assigned a training plan yet.
            {loadError && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--r)', maxWidth: 300 }}>
                Debug: {loadError}
              </div>
            )}
          </div>
        </div>
      )}

      {trainingPlan && days.length > 0 && (
        <>
          <div className="v2-subtabs">
            {days.map((day, i) => (
              <button
                key={i}
                className={`v2-subtab ${activeDay === i ? 'active' : ''}`}
                onClick={() => setActiveDay(i)}
              >
                {day.day}
              </button>
            ))}
          </div>

          <div className="v2-insight-bar" style={{ marginBottom: 16 }}>
            {days[activeDay]?.day} — {(days[activeDay]?.exercises || []).length} exercises
          </div>

          {(days[activeDay]?.exercises || []).map((ex, i) => (
            <div className="v2-ex-row" key={i}>
              <div className="v2-ex-left">
                <div className="v2-ex-dot" style={{ background: 'var(--v2)' }} />
                <div>
                  <div className="v2-ex-name">{ex.name}</div>
                  <div className="v2-ex-meta">{ex.sets} sets · {ex.reps} reps</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
