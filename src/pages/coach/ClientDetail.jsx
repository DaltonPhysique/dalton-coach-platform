import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

// ═══════════════════════════════════════════════════════════
// CLIENT DETAIL — V2 visual upgrade.
// All state, Supabase calls, and form logic preserved exactly.
// Only the JSX return was replaced to match V2 design language.
// ═══════════════════════════════════════════════════════════

const ANGLES = ['front', 'side', 'back']

export default function ClientDetail() {
  const { clientId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [weights, setWeights] = useState([])
  const [photos, setPhotos] = useState({ front: [], side: [], back: [] })
  const [tab, setTab] = useState('overview')

  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [nForm, setNForm] = useState({
    training_cal: '', training_protein: '', training_carbs: '', training_fat: '',
    rest_cal: '', rest_protein: '', rest_carbs: '', rest_fat: '', notes: '',
  })
  const [nBusy, setNBusy] = useState(false)
  const [nSaved, setNSaved] = useState(false)

  const [trainingPlan, setTrainingPlan] = useState(null)
  const [planName, setPlanName] = useState('')
  const [splitDays, setSplitDays] = useState([])
  const [tBusy, setTBusy] = useState(false)
  const [tSaved, setTSaved] = useState(false)

  useEffect(() => {
    loadClient()
    loadWeights()
    loadPhotos()
    loadNutritionPlan()
    loadTrainingPlan()
  }, [clientId])

  async function loadClient() {
    const { data } = await supabase.from('profiles').select('*').eq('id', clientId).single()
    setClient(data)
  }

  async function loadWeights() {
    const { data } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('log_date', { ascending: false })
      .limit(14)
    setWeights(data || [])
  }

  async function loadPhotos() {
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('log_date', { ascending: false })
    if (!data) return
    const grouped = { front: [], side: [], back: [] }
    for (const p of data) {
      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(p.storage_path, 60 * 60)
      grouped[p.angle]?.push({ ...p, url: signed?.signedUrl })
    }
    setPhotos(grouped)
  }

  async function loadNutritionPlan() {
    const { data } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      setNutritionPlan(data)
      setNForm({
        training_cal: data.training_cal ?? '',
        training_protein: data.training_protein ?? '',
        training_carbs: data.training_carbs ?? '',
        training_fat: data.training_fat ?? '',
        rest_cal: data.rest_cal ?? '',
        rest_protein: data.rest_protein ?? '',
        rest_carbs: data.rest_carbs ?? '',
        rest_fat: data.rest_fat ?? '',
        notes: data.notes ?? '',
      })
    }
  }

  async function loadTrainingPlan() {
    const { data } = await supabase
      .from('training_plans')
      .select('*')
      .eq('client_id', clientId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      setTrainingPlan(data)
      setPlanName(data.name || '')
      setSplitDays(data.split_json || [])
    }
  }

  async function saveNutritionPlan(e) {
    e.preventDefault()
    setNBusy(true)
    setNSaved(false)
    if (nutritionPlan) {
      await supabase.from('nutrition_plans').update({ active: false }).eq('id', nutritionPlan.id)
    }
    const { data, error } = await supabase
      .from('nutrition_plans')
      .insert({
        client_id: clientId,
        created_by: profile.id,
        active: true,
        training_cal: nForm.training_cal || null,
        training_protein: nForm.training_protein || null,
        training_carbs: nForm.training_carbs || null,
        training_fat: nForm.training_fat || null,
        rest_cal: nForm.rest_cal || null,
        rest_protein: nForm.rest_protein || null,
        rest_carbs: nForm.rest_carbs || null,
        rest_fat: nForm.rest_fat || null,
        notes: nForm.notes || null,
      })
      .select()
      .single()
    setNBusy(false)
    if (!error) {
      setNutritionPlan(data)
      setNSaved(true)
      setTimeout(() => setNSaved(false), 2500)
    }
  }

  function addSplitDay() {
    setSplitDays([...splitDays, { day: `Day ${splitDays.length + 1}`, exercises: [] }])
  }
  function removeSplitDay(i) {
    setSplitDays(splitDays.filter((_, idx) => idx !== i))
  }
  function updateDayName(i, name) {
    const next = [...splitDays]
    next[i] = { ...next[i], day: name }
    setSplitDays(next)
  }
  function addExercise(dayIdx) {
    const next = [...splitDays]
    next[dayIdx] = {
      ...next[dayIdx],
      exercises: [...(next[dayIdx].exercises || []), { name: '', sets: '2', reps: '8-10' }],
    }
    setSplitDays(next)
  }
  function updateExercise(dayIdx, exIdx, field, value) {
    const next = [...splitDays]
    const exercises = [...next[dayIdx].exercises]
    exercises[exIdx] = { ...exercises[exIdx], [field]: value }
    next[dayIdx] = { ...next[dayIdx], exercises }
    setSplitDays(next)
  }
  function removeExercise(dayIdx, exIdx) {
    const next = [...splitDays]
    next[dayIdx] = {
      ...next[dayIdx],
      exercises: next[dayIdx].exercises.filter((_, idx) => idx !== exIdx),
    }
    setSplitDays(next)
  }

  async function saveTrainingPlan(e) {
    e.preventDefault()
    setTBusy(true)
    setTSaved(false)
    if (trainingPlan) {
      await supabase.from('training_plans').update({ active: false }).eq('id', trainingPlan.id)
    }
    const { data, error } = await supabase
      .from('training_plans')
      .insert({
        client_id: clientId,
        created_by: profile.id,
        active: true,
        name: planName || 'Training Plan',
        split_json: splitDays,
      })
      .select()
      .single()
    setTBusy(false)
    if (!error) {
      setTrainingPlan(data)
      setTSaved(true)
      setTimeout(() => setTSaved(false), 2500)
    }
  }

  const latest = weights[0]
  const avg7 = weights.length
    ? weights.slice(0, 7).reduce((a, w) => a + Number(w.weight), 0) / Math.min(weights.length, 7)
    : null

  // ─── reusable field label style ───
  const LBL = {
    display: 'block', fontSize: 10, fontWeight: 800,
    letterSpacing: '.8px', textTransform: 'uppercase',
    color: 'var(--text3)', marginBottom: 7,
  }
  const SECTION_EYEBROW = {
    fontSize: 11, fontWeight: 800, letterSpacing: '1.2px',
    textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 64 }}>
          <button
            onClick={() => navigate('/coach')}
            style={{
              background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8,
              padding: '7px 14px', color: 'var(--text2)', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            All Clients
          </button>
          <div style={{ height: 20, width: 1, background: 'var(--border2)' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px' }}>
              {client?.full_name || '…'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginTop: 1 }}>
              {client?.goal_weight ? `Goal: ${client.goal_weight} lbs` : 'Client Detail'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 4 }}>
          {[
            { id: 'overview',   label: 'Overview' },
            { id: 'photos',     label: 'Photos' },
            { id: 'nutrition',  label: 'Nutrition Plan' },
            { id: 'training',   label: 'Training Plan' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '14px 20px', background: 'none', border: 'none',
                fontSize: 14, fontWeight: 700,
                color: tab === t.id ? 'var(--v2)' : 'var(--text2)',
                borderBottom: tab === t.id ? '2px solid var(--v)' : '2px solid transparent',
                cursor: 'pointer', transition: 'color .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Page body ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>

        {/* ────── OVERVIEW TAB ────── */}
        {tab === 'overview' && (
          <>
            {/* Weight stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Latest Weight', val: latest ? `${Number(latest.weight).toFixed(1)} lbs` : '—', col: 'var(--text)' },
                { label: '7-Day Avg', val: avg7 ? `${avg7.toFixed(1)} lbs` : '—', col: 'var(--g)' },
                { label: 'Goal Weight', val: client?.goal_weight ? `${client.goal_weight} lbs` : '—', col: 'var(--v2)' },
              ].map((s) => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px', color: s.col }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Weight log */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={SECTION_EYEBROW}>Weight History</div>
              </div>
              {weights.length === 0 && (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>No weigh-ins logged yet.</div>
              )}
              {weights.map((w, i) => (
                <div key={w.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: i < weights.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>{w.log_date}</span>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{Number(w.weight).toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}> lbs</span></span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ────── PHOTOS TAB ────── */}
        {tab === 'photos' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
            <div style={SECTION_EYEBROW}>Progress Photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {ANGLES.map((angle) => {
                const latestPhoto = photos[angle]?.[0]
                return (
                  <div key={angle}>
                    <div style={{
                      aspectRatio: '3/4', background: 'var(--bg4)', border: '1px solid var(--border)',
                      borderRadius: 14, overflow: 'hidden', position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {latestPhoto ? (
                        <img src={latestPhoto.url} alt={angle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text3)' }}>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>None yet</div>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
                      {angle}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ────── NUTRITION PLAN TAB ────── */}
        {tab === 'nutrition' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={SECTION_EYEBROW}>Assign Nutrition Plan</div>
                <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                  {nutritionPlan ? 'Editing active plan — saving will replace it.' : 'No plan assigned yet.'}
                </div>
              </div>
              {nutritionPlan && (
                <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--gbg)', color: 'var(--g)', border: '1px solid var(--gbrd)', borderRadius: 6, padding: '4px 10px' }}>
                  Active plan loaded
                </span>
              )}
            </div>

            <form onSubmit={saveNutritionPlan}>
              {/* Training day */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--v2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--v)' }} />
                  Training Day
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { key: 'training_cal',     label: 'Calories' },
                    { key: 'training_protein', label: 'Protein (g)' },
                    { key: 'training_carbs',   label: 'Carbs (g)' },
                    { key: 'training_fat',     label: 'Fat (g)' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={LBL}>{f.label}</label>
                      <input
                        type="number"
                        value={nForm[f.key]}
                        onChange={(e) => setNForm({ ...nForm, [f.key]: e.target.value })}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rest day */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--a)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--a)' }} />
                  Rest Day
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { key: 'rest_cal',     label: 'Calories' },
                    { key: 'rest_protein', label: 'Protein (g)' },
                    { key: 'rest_carbs',   label: 'Carbs (g)' },
                    { key: 'rest_fat',     label: 'Fat (g)' },
                  ].map((f) => (
                    <div key={f.key}>
                      <label style={LBL}>{f.label}</label>
                      <input
                        type="number"
                        value={nForm[f.key]}
                        onChange={(e) => setNForm({ ...nForm, [f.key]: e.target.value })}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <label style={LBL}>Coaching Notes</label>
                <textarea
                  rows={3}
                  value={nForm.notes}
                  onChange={(e) => setNForm({ ...nForm, notes: e.target.value })}
                  placeholder="Any coaching notes about this plan…"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={nBusy}
                  style={{ maxWidth: 240 }}
                >
                  {nBusy ? 'Saving…' : 'Save Nutrition Plan'}
                </button>
                {nSaved && (
                  <span style={{ color: 'var(--g)', fontWeight: 700, fontSize: 14 }}>✓ Plan saved and active</span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ────── TRAINING PLAN TAB ────── */}
        {tab === 'training' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={SECTION_EYEBROW}>Assign Training Plan</div>
                <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                  {trainingPlan ? `Active plan: "${trainingPlan.name}"` : 'No plan assigned yet.'}
                </div>
              </div>
              {trainingPlan && (
                <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--gbg)', color: 'var(--g)', border: '1px solid var(--gbrd)', borderRadius: 6, padding: '4px 10px' }}>
                  Active plan loaded
                </span>
              )}
            </div>

            <form onSubmit={saveTrainingPlan}>
              {/* Plan name */}
              <div style={{ marginBottom: 24 }}>
                <label style={LBL}>Plan Name</label>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Upper/Lower Split"
                  style={{ fontWeight: 700, fontSize: 16 }}
                />
              </div>

              {/* Split days */}
              {splitDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: 18, marginBottom: 12,
                  }}
                >
                  {/* Day header */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                    <input
                      value={day.day}
                      onChange={(e) => updateDayName(dayIdx, e.target.value)}
                      placeholder="Day name (e.g. Upper A)"
                      style={{ fontWeight: 700, fontSize: 15, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeSplitDay(dayIdx)}
                      style={{
                        background: 'var(--rbg)', border: '1px solid var(--rbrd)',
                        color: 'var(--r)', borderRadius: 8, padding: '8px 12px',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      Remove Day
                    </button>
                  </div>

                  {/* Exercise rows */}
                  {(day.exercises || []).map((ex, exIdx) => (
                    <div key={exIdx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <input
                        value={ex.name}
                        onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                        placeholder="Exercise name"
                        style={{ flex: 3 }}
                      />
                      <input
                        value={ex.sets}
                        onChange={(e) => updateExercise(dayIdx, exIdx, 'sets', e.target.value)}
                        placeholder="Sets"
                        style={{ flex: 1 }}
                      />
                      <input
                        value={ex.reps}
                        onChange={(e) => updateExercise(dayIdx, exIdx, 'reps', e.target.value)}
                        placeholder="Reps"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(dayIdx, exIdx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addExercise(dayIdx)}
                    style={{
                      background: 'var(--bg4)', border: '1px solid var(--border2)',
                      color: 'var(--text2)', borderRadius: 8, padding: '8px 14px',
                      fontSize: 13, fontWeight: 700, marginTop: 4,
                    }}
                  >
                    + Add Exercise
                  </button>
                </div>
              ))}

              {/* Add day + Save */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={addSplitDay}
                  style={{
                    background: 'var(--vbg)', border: '1px solid var(--vbrd)',
                    color: 'var(--v2)', borderRadius: 10, padding: '11px 20px',
                    fontSize: 14, fontWeight: 700,
                  }}
                >
                  + Add Training Day
                </button>
                <button
                  className="btn-primary"
                  type="submit"
                  disabled={tBusy}
                  style={{ maxWidth: 240 }}
                >
                  {tBusy ? 'Saving…' : 'Save Training Plan'}
                </button>
                {tSaved && (
                  <span style={{ color: 'var(--g)', fontWeight: 700, fontSize: 14 }}>✓ Plan saved and active</span>
                )}
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
