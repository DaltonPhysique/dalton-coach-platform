import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

const ANGLES = ['front', 'side', 'back']
const EYEBROW = { fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }
const LBL = { display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }
const SECTION = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }

function avg(arr) {
  if (!arr?.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000)
}

export default function ClientDetail() {
  const { clientId } = useParams()
  const { profile }  = useAuth()
  const navigate     = useNavigate()

  // ── existing state (all preserved) ────────────────────────────────────────
  const [client,        setClient]       = useState(null)
  const [weights,       setWeights]      = useState([])
  const [photos,        setPhotos]       = useState({ front: [], side: [], back: [] })
  const [tab,           setTab]          = useState('overview')
  const [nutritionPlan, setNutritionPlan]= useState(null)
  const [nForm,         setNForm]        = useState({
    training_cal: '', training_protein: '', training_carbs: '', training_fat: '',
    rest_cal: '', rest_protein: '', rest_carbs: '', rest_fat: '', notes: '',
  })
  const [nBusy, setNBusy] = useState(false)
  const [nSaved,setNSaved]= useState(false)
  const [trainingPlan, setTrainingPlan] = useState(null)
  const [planName,     setPlanName]     = useState('')
  const [splitDays,    setSplitDays]    = useState([])
  const [tBusy, setTBusy] = useState(false)
  const [tSaved,setTSaved]= useState(false)

  // ── new state ──────────────────────────────────────────────────────────────
  const [stats,       setStats]      = useState(null)
  const [statsForm,   setStatsForm]  = useState({ current_phase: '', compliance_pct: '', last_checkin_date: '' })
  const [statsBusy,   setStatsBusy]  = useState(false)
  const [statsSaved,  setStatsSaved] = useState(false)

  const [recLogs,     setRecLogs]    = useState([])
  const [recForm,     setRecForm]    = useState({ log_date: '', sleep: '3', energy: '3', soreness: '3', stress: '3', digestion: '3', motivation: '3' })
  const [recBusy,     setRecBusy]    = useState(false)

  const [notes,       setNotes]      = useState([])
  const [noteText,    setNoteText]   = useState('')
  const [noteBusy,    setNoteBusy]   = useState(false)

  useEffect(() => {
    loadClient(); loadWeights(); loadPhotos(); loadNutritionPlan(); loadTrainingPlan()
    loadStats(); loadRecLogs(); loadNotes()
  }, [clientId])

  // ── existing loaders (all preserved verbatim) ──────────────────────────────
  async function loadClient() {
    const { data } = await supabase.from('profiles').select('*').eq('id', clientId).single()
    setClient(data)
  }
  async function loadWeights() {
    const { data } = await supabase
      .from('weight_logs').select('*').eq('client_id', clientId)
      .order('log_date', { ascending: false }).limit(14)
    setWeights(data || [])
  }
  async function loadPhotos() {
    const { data } = await supabase
      .from('progress_photos').select('*').eq('client_id', clientId)
      .order('log_date', { ascending: false })
    if (!data) return
    const grouped = { front: [], side: [], back: [] }
    for (const p of data) {
      const { data: signed } = await supabase.storage
        .from('progress-photos').createSignedUrl(p.storage_path, 60 * 60)
      grouped[p.angle]?.push({ ...p, url: signed?.signedUrl })
    }
    setPhotos(grouped)
  }
  async function loadNutritionPlan() {
    const { data } = await supabase
      .from('nutrition_plans').select('*').eq('client_id', clientId).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data) {
      setNutritionPlan(data)
      setNForm({
        training_cal: data.training_cal ?? '', training_protein: data.training_protein ?? '',
        training_carbs: data.training_carbs ?? '', training_fat: data.training_fat ?? '',
        rest_cal: data.rest_cal ?? '', rest_protein: data.rest_protein ?? '',
        rest_carbs: data.rest_carbs ?? '', rest_fat: data.rest_fat ?? '', notes: data.notes ?? '',
      })
    }
  }
  async function loadTrainingPlan() {
    const { data } = await supabase
      .from('training_plans').select('*').eq('client_id', clientId).eq('active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data) { setTrainingPlan(data); setPlanName(data.name || ''); setSplitDays(data.split_json || []) }
  }
  async function saveNutritionPlan(e) {
    e.preventDefault(); setNBusy(true); setNSaved(false)
    if (nutritionPlan) await supabase.from('nutrition_plans').update({ active: false }).eq('id', nutritionPlan.id)
    const { data, error } = await supabase.from('nutrition_plans').insert({
      client_id: clientId, created_by: profile.id, active: true,
      training_cal: nForm.training_cal || null, training_protein: nForm.training_protein || null,
      training_carbs: nForm.training_carbs || null, training_fat: nForm.training_fat || null,
      rest_cal: nForm.rest_cal || null, rest_protein: nForm.rest_protein || null,
      rest_carbs: nForm.rest_carbs || null, rest_fat: nForm.rest_fat || null,
      notes: nForm.notes || null,
    }).select().single()
    setNBusy(false)
    if (!error) { setNutritionPlan(data); setNSaved(true); setTimeout(() => setNSaved(false), 2500) }
  }
  function addSplitDay() { setSplitDays([...splitDays, { day: `Day ${splitDays.length + 1}`, exercises: [] }]) }
  function removeSplitDay(i) { setSplitDays(splitDays.filter((_, idx) => idx !== i)) }
  function updateDayName(i, name) { const n=[...splitDays]; n[i]={...n[i],day:name}; setSplitDays(n) }
  function addExercise(di) {
    const n=[...splitDays]; n[di]={...n[di],exercises:[...(n[di].exercises||[]),{name:'',sets:'2',reps:'8-10'}]}; setSplitDays(n)
  }
  function updateExercise(di, ei, field, value) {
    const n=[...splitDays]; const ex=[...n[di].exercises]; ex[ei]={...ex[ei],[field]:value}; n[di]={...n[di],exercises:ex}; setSplitDays(n)
  }
  function removeExercise(di, ei) {
    const n=[...splitDays]; n[di]={...n[di],exercises:n[di].exercises.filter((_,idx)=>idx!==ei)}; setSplitDays(n)
  }
  async function saveTrainingPlan(e) {
    e.preventDefault(); setTBusy(true); setTSaved(false)
    if (trainingPlan) await supabase.from('training_plans').update({ active: false }).eq('id', trainingPlan.id)
    const { data, error } = await supabase.from('training_plans').insert({
      client_id: clientId, created_by: profile.id, active: true,
      name: planName || 'Training Plan', split_json: splitDays,
    }).select().single()
    setTBusy(false)
    if (!error) { setTrainingPlan(data); setTSaved(true); setTimeout(() => setTSaved(false), 2500) }
  }

  // ── new loaders ────────────────────────────────────────────────────────────
  async function loadStats() {
    const { data } = await supabase
      .from('coach_client_stats').select('*').eq('client_id', clientId).maybeSingle()
    if (data) {
      setStats(data)
      setStatsForm({
        current_phase: data.current_phase || '',
        compliance_pct: data.compliance_pct ?? '',
        last_checkin_date: data.last_checkin_date || '',
      })
    }
  }
  async function saveStats(e) {
    e.preventDefault(); setStatsBusy(true); setStatsSaved(false)
    const payload = {
      client_id: clientId, coach_id: profile.id,
      current_phase: statsForm.current_phase || null,
      compliance_pct: statsForm.compliance_pct !== '' ? Number(statsForm.compliance_pct) : null,
      last_checkin_date: statsForm.last_checkin_date || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('coach_client_stats').upsert(payload, { onConflict: 'client_id' }).select().single()
    setStatsBusy(false)
    if (!error) { setStats(data); setStatsSaved(true); setTimeout(() => setStatsSaved(false), 2500) }
  }

  async function loadRecLogs() {
    const { data } = await supabase
      .from('coach_recovery_logs').select('*').eq('client_id', clientId)
      .order('log_date', { ascending: false }).limit(14)
    setRecLogs(data || [])
    // Pre-fill date with today
    const today = new Date().toISOString().slice(0, 10)
    setRecForm(f => ({ ...f, log_date: today }))
  }
  async function saveRecLog(e) {
    e.preventDefault(); setRecBusy(true)
    await supabase.from('coach_recovery_logs').upsert({
      client_id: clientId, coach_id: profile.id,
      log_date: recForm.log_date,
      sleep: Number(recForm.sleep), energy: Number(recForm.energy),
      soreness: Number(recForm.soreness), stress: Number(recForm.stress),
      digestion: Number(recForm.digestion), motivation: Number(recForm.motivation),
    }, { onConflict: 'client_id,log_date' })
    setRecBusy(false)
    loadRecLogs()
  }
  async function deleteRecLog(id) {
    await supabase.from('coach_recovery_logs').delete().eq('id', id)
    loadRecLogs()
  }

  async function loadNotes() {
    const { data } = await supabase
      .from('coach_notes').select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(50)
    setNotes(data || [])
  }
  async function saveNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteBusy(true)
    await supabase.from('coach_notes').insert({ client_id: clientId, coach_id: profile.id, note: noteText.trim() })
    setNoteText('')
    setNoteBusy(false)
    loadNotes()
  }
  async function deleteNote(id) {
    await supabase.from('coach_notes').delete().eq('id', id)
    loadNotes()
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const latest = weights[0]
  const avg7   = weights.length ? weights.slice(0,7).reduce((a,w)=>a+Number(w.weight),0)/Math.min(weights.length,7) : null
  const totalLost = (client?.start_weight && latest) ? (Number(client.start_weight) - Number(latest.weight)).toFixed(1) : null
  const progressPct = (client?.start_weight && client?.goal_weight && latest)
    ? Math.min(100, Math.max(0, ((Number(client.start_weight)-Number(latest.weight))/(Number(client.start_weight)-Number(client.goal_weight)))*100))
    : null
  const last7w = weights.slice(0,7); const prev7w = weights.slice(7,14)
  const weeklyDelta = (last7w.length && prev7w.length)
    ? avg(last7w.map(w=>Number(w.weight))) - avg(prev7w.map(w=>Number(w.weight)))
    : null
  const avgRec = recLogs.length ? avg(recLogs.slice(0,7).map(r=>r.sleep+r.energy+r.soreness+r.stress+r.digestion+r.motivation)) : null
  const avgMot = recLogs.length ? avg(recLogs.slice(0,7).map(r=>r.motivation).filter(Boolean)) : null
  const daysSinceCheckin = daysSince(stats?.last_checkin_date)

  const TABS = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'recovery',  label: 'Recovery Log' },
    { id: 'notes',     label: 'Coach Notes' },
    { id: 'photos',    label: 'Photos'    },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'training',  label: 'Training'  },
  ]

  function sliderInput(key, label, low, high) {
    return (
      <div key={key} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>{recForm[key]}</span>
        </div>
        <input type="range" min="1" max="5" value={recForm[key]} className="v2-glow-slider"
          onChange={e => setRecForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
          <span>{low}</span><span>{high}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ═══ STICKY HEADER ═══ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 28px' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 62 }}>
            <button onClick={() => navigate('/coach')} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 13px', color: 'var(--text2)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              All Clients
            </button>
            <div style={{ height: 20, width: 1, background: 'var(--border2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--vbg)', border: '1px solid var(--vbrd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--v2)', flexShrink: 0 }}>
                {client?.full_name?.[0]?.toUpperCase() || '…'}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px', lineHeight: 1.2 }}>{client?.full_name || '…'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                  {stats?.current_phase || 'No phase set'}
                  {client?.start_weight ? ` · Start ${client.start_weight} lbs` : ''}
                  {client?.goal_weight ? ` · Goal ${client.goal_weight} lbs` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 28px' }}>
          <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '13px 18px', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: tab === t.id ? 'var(--v2)' : 'var(--text2)', borderBottom: tab === t.id ? '2px solid var(--v)' : '2px solid transparent', transition: 'color .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '26px 28px' }}>

        {/* ══════ OVERVIEW TAB ══════ */}
        {tab === 'overview' && (
          <>
            {/* 5 weight KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Current Weight', val: latest ? `${Number(latest.weight).toFixed(1)}` : '—', unit: latest ? 'lbs' : '', col: 'var(--text)' },
                { label: '7-Day Avg',      val: avg7 ? avg7.toFixed(1) : '—',              unit: avg7 ? 'lbs' : '',             col: 'var(--g)' },
                { label: 'Weekly Δ',       val: weeklyDelta !== null ? `${weeklyDelta>0?'+':''}${weeklyDelta.toFixed(1)}` : '—', unit: weeklyDelta!==null?'lbs':'', col: weeklyDelta===null?'var(--text3)':weeklyDelta<=0?'var(--g)':'var(--r)' },
                { label: 'Total Lost',     val: totalLost !== null ? (totalLost > 0 ? totalLost : '0') : '—', unit: totalLost ? 'lbs' : '', col: totalLost > 0 ? 'var(--g)' : 'var(--text3)' },
                { label: 'Goal Progress',  val: progressPct !== null ? progressPct.toFixed(0) : '—', unit: progressPct !== null ? '%' : '', col: 'var(--v2)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '15px 14px' }}>
                  <div style={EYEBROW}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: s.col, lineHeight: 1 }}>
                    {s.val}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)' }}>{s.unit ? ` ${s.unit}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {progressPct !== null && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginBottom: 9 }}>
                  <span>Progress to {client.goal_weight} lbs</span>
                  <span>{progressPct.toFixed(0)}% complete</span>
                </div>
                <div style={{ height: 7, background: 'var(--bg6)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,var(--v3),var(--v),#00cba9)', borderRadius: 5, transition: 'width .5s' }} />
                </div>
              </div>
            )}

            {/* Coaching metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {/* Recovery avg */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '15px 16px' }}>
                <div style={EYEBROW}>Avg Recovery Score</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px', color: avgRec===null?'var(--text3)':avgRec>=22?'var(--g)':avgRec>=16?'var(--a)':'var(--r)', lineHeight: 1 }}>
                  {avgRec !== null ? avgRec.toFixed(0) : '—'}
                  {avgRec !== null && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>/30</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>7-day avg · 6 metrics</div>
              </div>

              {/* Motivation avg */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '15px 16px' }}>
                <div style={EYEBROW}>Avg Motivation</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px', color: avgMot===null?'var(--text3)':avgMot>=4?'var(--g)':avgMot>=3?'var(--a)':'var(--r)', lineHeight: 1 }}>
                  {avgMot !== null ? avgMot.toFixed(1) : '—'}
                  {avgMot !== null && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>/5</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>7-day avg</div>
              </div>

              {/* Compliance */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '15px 16px' }}>
                <div style={EYEBROW}>Compliance</div>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px',
                  color: stats?.compliance_pct==null?'var(--text3)':stats.compliance_pct>=90?'var(--g)':stats.compliance_pct>=70?'var(--a)':'var(--r)', lineHeight: 1 }}>
                  {stats?.compliance_pct != null ? stats.compliance_pct : '—'}
                  {stats?.compliance_pct != null && <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>%</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>this week</div>
              </div>
            </div>

            {/* Plan summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
                <div style={EYEBROW}>Active Phase</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{stats?.current_phase || '—'}</div>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
                <div style={EYEBROW}>Current Calories</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {nutritionPlan ? `${nutritionPlan.training_cal} / ${nutritionPlan.rest_cal}` : '—'}
                  {nutritionPlan && <span style={{ fontSize: 11, color: 'var(--text3)' }}> train / rest</span>}
                </div>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
                <div style={EYEBROW}>Training Split</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{trainingPlan?.name || '—'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 13, padding: '14px 16px' }}>
                <div style={EYEBROW}>Last Weigh-In</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{latest?.log_date || '—'}</div>
              </div>
              <div style={{ background: 'var(--bg2)', border: `1px solid ${daysSinceCheckin !== null && daysSinceCheckin >= 7 ? 'var(--abrd)' : 'var(--border)'}`, borderRadius: 13, padding: '14px 16px' }}>
                <div style={EYEBROW}>Days Since Check-In</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: daysSinceCheckin === null ? 'var(--text3)' : daysSinceCheckin >= 14 ? 'var(--r)' : daysSinceCheckin >= 7 ? 'var(--a)' : 'var(--g)' }}>
                  {daysSinceCheckin !== null ? `${daysSinceCheckin} days` : '—'}
                </div>
              </div>
            </div>

            {/* Coach client stats form */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', marginBottom: 22 }}>
              <div style={{ ...EYEBROW, marginBottom: 16 }}>Coaching Metadata</div>
              <form onSubmit={saveStats}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={LBL}>Active Phase</label>
                    <input value={statsForm.current_phase} onChange={e => setStatsForm(f => ({ ...f, current_phase: e.target.value }))} placeholder="Phase 1 Cut" />
                  </div>
                  <div>
                    <label style={LBL}>Compliance % (this week)</label>
                    <input type="number" min="0" max="100" value={statsForm.compliance_pct} onChange={e => setStatsForm(f => ({ ...f, compliance_pct: e.target.value }))} placeholder="85" />
                  </div>
                  <div>
                    <label style={LBL}>Last Check-In Date</label>
                    <input type="date" value={statsForm.last_checkin_date} onChange={e => setStatsForm(f => ({ ...f, last_checkin_date: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn-primary" type="submit" disabled={statsBusy} style={{ maxWidth: 200 }}>
                    {statsBusy ? 'Saving…' : 'Save'}
                  </button>
                  {statsSaved && <span style={{ color: 'var(--g)', fontSize: 13, fontWeight: 700 }}>✓ Saved</span>}
                </div>
              </form>
            </div>

            {/* Weight history */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={EYEBROW}>Weight History</div>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{weights.length} entries</span>
              </div>
              {weights.length === 0 && (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No weigh-ins logged yet.</div>
              )}
              {weights.map((w, i) => {
                const prev = weights[i + 1]
                const delta = prev ? (Number(w.weight) - Number(prev.weight)) : null
                return (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < weights.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>{w.log_date}</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{Number(w.weight).toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}> lbs</span></span>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 56, textAlign: 'right', color: delta===null?'transparent':delta<0?'var(--g)':delta>0?'var(--r)':'var(--text3)' }}>
                      {delta !== null ? `${delta>0?'+':''}${delta.toFixed(1)}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══════ RECOVERY LOG TAB ══════ */}
        {tab === 'recovery' && (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', marginBottom: 16 }}>
              <div style={{ ...EYEBROW, marginBottom: 20 }}>Log Recovery Entry</div>
              <form onSubmit={saveRecLog}>
                <div style={{ marginBottom: 16 }}>
                  <label style={LBL}>Date</label>
                  <input type="date" value={recForm.log_date} onChange={e => setRecForm(f => ({ ...f, log_date: e.target.value }))} style={{ maxWidth: 200 }} required />
                </div>
                {sliderInput('sleep',      'Sleep Quality',   'Terrible',   'Excellent')}
                {sliderInput('energy',     'Energy Level',    'Drained',    'Energized')}
                {sliderInput('soreness',   'Muscle Soreness', 'Destroyed',  'Fresh')}
                {sliderInput('stress',     'Stress Level',    'High Stress','Calm')}
                {sliderInput('digestion',  'Digestion',       'Off',        'Optimal')}
                {sliderInput('motivation', 'Motivation to Train', 'Low',    'High')}
                <button className="btn-primary" type="submit" disabled={recBusy} style={{ maxWidth: 220 }}>
                  {recBusy ? 'Saving…' : 'Save Recovery Log'}
                </button>
              </form>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={EYEBROW}>Recovery History</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {recLogs.length > 0 && `Avg: ${avg(recLogs.slice(0,7).map(r=>r.sleep+r.energy+r.soreness+r.stress+r.digestion+r.motivation))?.toFixed(0) ?? '—'}/30`}
                </div>
              </div>
              {recLogs.length === 0 && (
                <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No recovery entries yet.</div>
              )}
              {recLogs.map((r, i) => {
                const total = r.sleep + r.energy + r.soreness + r.stress + r.digestion + r.motivation
                const col = total >= 22 ? 'var(--g)' : total >= 16 ? 'var(--a)' : 'var(--r)'
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: i < recLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, width: 90, flexShrink: 0 }}>{r.log_date}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, flex: 1 }}>
                      Slp:{r.sleep} E:{r.energy} Sor:{r.soreness} Str:{r.stress} Dig:{r.digestion} Mot:{r.motivation}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: col, flexShrink: 0 }}>{total}/30</span>
                    <button onClick={() => deleteRecLog(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ══════ COACH NOTES TAB ══════ */}
        {tab === 'notes' && (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px', marginBottom: 16 }}>
              <div style={{ ...EYEBROW, marginBottom: 14 }}>Add Note</div>
              <form onSubmit={saveNote}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Coaching note, observation, or instruction…"
                  rows={4}
                  style={{ marginBottom: 14, resize: 'vertical' }}
                />
                <button className="btn-primary" type="submit" disabled={noteBusy} style={{ maxWidth: 200 }}>
                  {noteBusy ? 'Saving…' : 'Add Note'}
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.length === 0 && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                  No notes yet. Add your first coaching note above.
                </div>
              )}
              {notes.map(n => (
                <div key={n.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                      {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text2)' }}>{n.note}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════ PHOTOS TAB ══════ */}
        {tab === 'photos' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={EYEBROW}>Progress Photos</div>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                {ANGLES.reduce((a, ang) => a + (photos[ang]?.length || 0), 0)} photos total
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {ANGLES.map(angle => {
                const p = photos[angle]?.[0]
                return (
                  <div key={angle}>
                    <div style={{ aspectRatio: '3/4', background: 'var(--bg4)', border: `1px solid ${p ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {p ? <img src={p.url} alt={angle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         : <div style={{ textAlign: 'center', color: 'var(--text3)' }}><div style={{ fontSize: 28, marginBottom: 6 }}>📸</div><div style={{ fontSize: 12, fontWeight: 700 }}>None yet</div></div>}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
                      {angle} {photos[angle]?.length > 0 ? `· ${photos[angle].length}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════ NUTRITION PLAN TAB ══════ */}
        {tab === 'nutrition' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
              <div>
                <div style={EYEBROW}>Nutrition Plan</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px' }}>{nutritionPlan ? 'Edit Active Plan' : 'Assign Plan'}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{nutritionPlan ? 'Saving will replace the current plan.' : 'No nutrition plan assigned yet.'}</div>
              </div>
              {nutritionPlan && <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--gbg)', color: 'var(--g)', border: '1px solid var(--gbrd)', borderRadius: 8, padding: '5px 12px' }}>✓ Active plan loaded</span>}
            </div>
            <form onSubmit={saveNutritionPlan}>
              <div style={{ ...SECTION }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--v)', boxShadow: '0 0 6px var(--v)' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--v2)' }}>Training Day</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[['training_cal','Calories'],['training_protein','Protein (g)'],['training_carbs','Carbs (g)'],['training_fat','Fat (g)']].map(([k,l]) => (
                    <div key={k}><label style={LBL}>{l}</label><input type="number" value={nForm[k]} onChange={e => setNForm({...nForm,[k]:e.target.value})} placeholder="—" /></div>
                  ))}
                </div>
              </div>
              <div style={{ ...SECTION }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--a)', boxShadow: '0 0 6px var(--a)' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--a)' }}>Rest Day</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[['rest_cal','Calories'],['rest_protein','Protein (g)'],['rest_carbs','Carbs (g)'],['rest_fat','Fat (g)']].map(([k,l]) => (
                    <div key={k}><label style={LBL}>{l}</label><input type="number" value={nForm[k]} onChange={e => setNForm({...nForm,[k]:e.target.value})} placeholder="—" /></div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={LBL}>Coaching Notes</label>
                <textarea rows={3} value={nForm.notes} onChange={e => setNForm({...nForm,notes:e.target.value})} placeholder="Any coaching notes…" style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <button className="btn-primary" type="submit" disabled={nBusy} style={{ maxWidth: 240 }}>{nBusy ? 'Saving…' : 'Save Nutrition Plan'}</button>
                {nSaved && <span style={{ color: 'var(--g)', fontWeight: 700, fontSize: 14 }}>✓ Saved and active</span>}
              </div>
            </form>
          </div>
        )}

        {/* ══════ TRAINING PLAN TAB ══════ */}
        {tab === 'training' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
              <div>
                <div style={EYEBROW}>Training Plan</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{trainingPlan ? `"${trainingPlan.name}"` : 'Assign Plan'}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{trainingPlan ? 'Saving will replace the current plan.' : 'No training plan assigned yet.'}</div>
              </div>
              {trainingPlan && <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--gbg)', color: 'var(--g)', border: '1px solid var(--gbrd)', borderRadius: 8, padding: '5px 12px' }}>✓ Active plan loaded</span>}
            </div>
            <form onSubmit={saveTrainingPlan}>
              <div style={{ marginBottom: 22 }}>
                <label style={LBL}>Plan Name</label>
                <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Upper/Lower Split" style={{ fontWeight: 700, fontSize: 16 }} />
              </div>
              {splitDays.map((day, di) => (
                <div key={di} style={{ ...SECTION }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                    <input value={day.day} onChange={e => updateDayName(di, e.target.value)} style={{ fontWeight: 700, fontSize: 15, flex: 1 }} />
                    <button type="button" onClick={() => removeSplitDay(di)} style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Remove</button>
                  </div>
                  {(day.exercises||[]).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 28px', gap: 8, marginBottom: 6, padding: '0 2px' }}>
                      {['Exercise','Sets','Reps',''].map(h => <div key={h} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)' }}>{h}</div>)}
                    </div>
                  )}
                  {(day.exercises||[]).map((ex, ei) => (
                    <div key={ei} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input value={ex.name} onChange={e => updateExercise(di,ei,'name',e.target.value)} placeholder="Exercise name" />
                      <input value={ex.sets} onChange={e => updateExercise(di,ei,'sets',e.target.value)} placeholder="2" />
                      <input value={ex.reps} onChange={e => updateExercise(di,ei,'reps',e.target.value)} placeholder="8-10" />
                      <button type="button" onClick={() => removeExercise(di,ei)} style={{ background:'none',border:'none',color:'var(--text3)',fontSize:20,lineHeight:1,padding:0,cursor:'pointer' }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addExercise(di)} style={{ background:'var(--bg4)',border:'1px solid var(--border2)',color:'var(--text2)',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:700,marginTop:4 }}>+ Add Exercise</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={addSplitDay} style={{ background:'var(--vbg)',border:'1px solid var(--vbrd)',color:'var(--v2)',borderRadius:10,padding:'11px 20px',fontSize:14,fontWeight:700 }}>+ Add Training Day</button>
                <button className="btn-primary" type="submit" disabled={tBusy} style={{ maxWidth: 240 }}>{tBusy ? 'Saving…' : 'Save Training Plan'}</button>
                {tSaved && <span style={{ color: 'var(--g)', fontWeight: 700, fontSize: 14 }}>✓ Saved and active</span>}
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
