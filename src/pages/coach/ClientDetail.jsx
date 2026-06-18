import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

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

  return (
    <div className="app-shell wide">
      <button className="back-link" onClick={() => navigate('/coach')} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
        ← Back to clients
      </button>

      <div className="topbar" style={{ paddingTop: 0 }}>
        <div className="brand">
          {client?.full_name || 'Client'}
          <span>Client Detail</span>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab-btn ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>Photos</button>
        <button className={`tab-btn ${tab === 'nutrition' ? 'active' : ''}`} onClick={() => setTab('nutrition')}>Nutrition Plan</button>
        <button className={`tab-btn ${tab === 'training' ? 'active' : ''}`} onClick={() => setTab('training')}>Training Plan</button>
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="card-title">Weight History</div>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Latest</div>
              <div className="stat-value">{latest ? `${Number(latest.weight).toFixed(1)} lbs` : '—'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">7-Day Avg</div>
              <div className="stat-value">{avg7 ? `${avg7.toFixed(1)} lbs` : '—'}</div>
            </div>
          </div>
          <div className="log-list">
            {weights.length === 0 && <div className="empty-state">No weigh-ins logged yet.</div>}
            {weights.map((w) => (
              <div className="log-row" key={w.id}>
                <span className="date">{w.log_date}</span>
                <span className="val">{Number(w.weight).toFixed(1)} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'photos' && (
        <div className="card">
          <div className="card-title">Progress Photos</div>
          <div className="photo-grid">
            {ANGLES.map((angle) => {
              const latestPhoto = photos[angle]?.[0]
              return (
                <div key={angle}>
                  <div className="photo-slot" style={{ cursor: 'default' }}>
                    {latestPhoto ? (
                      <img src={latestPhoto.url} alt={angle} />
                    ) : (
                      <div className="placeholder">
                        <div className="icon">📸</div>
                        None yet
                      </div>
                    )}
                  </div>
                  <div className="photo-angle-label">{angle}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'nutrition' && (
        <div className="card">
          <div className="card-title">Assign Nutrition Plan</div>
          <form onSubmit={saveNutritionPlan}>
            <div className="muted" style={{ marginBottom: 10, fontWeight: 700 }}>Training Day</div>
            <div className="form-grid-3" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label className="form-label">Calories</label>
                <input type="number" value={nForm.training_cal} onChange={(e) => setNForm({ ...nForm, training_cal: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Protein (g)</label>
                <input type="number" value={nForm.training_protein} onChange={(e) => setNForm({ ...nForm, training_protein: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Carbs (g)</label>
                <input type="number" value={nForm.training_carbs} onChange={(e) => setNForm({ ...nForm, training_carbs: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label className="form-label">Fat (g)</label>
              <input type="number" value={nForm.training_fat} onChange={(e) => setNForm({ ...nForm, training_fat: e.target.value })} />
            </div>

            <div className="muted" style={{ margin: '16px 0 10px', fontWeight: 700 }}>Rest Day</div>
            <div className="form-grid-3" style={{ marginBottom: 10 }}>
              <div className="form-group">
                <label className="form-label">Calories</label>
                <input type="number" value={nForm.rest_cal} onChange={(e) => setNForm({ ...nForm, rest_cal: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Protein (g)</label>
                <input type="number" value={nForm.rest_protein} onChange={(e) => setNForm({ ...nForm, rest_protein: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Carbs (g)</label>
                <input type="number" value={nForm.rest_carbs} onChange={(e) => setNForm({ ...nForm, rest_carbs: e.target.value })} />
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 160 }}>
              <label className="form-label">Fat (g)</label>
              <input type="number" value={nForm.rest_fat} onChange={(e) => setNForm({ ...nForm, rest_fat: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                rows={3}
                value={nForm.notes}
                onChange={(e) => setNForm({ ...nForm, notes: e.target.value })}
                placeholder="Any coaching notes about this plan…"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={nBusy}>
              {nBusy ? 'Saving…' : 'Save Nutrition Plan'}
            </button>
            {nSaved && <div className="success-text">Plan saved and active for this client.</div>}
          </form>
        </div>
      )}

      {tab === 'training' && (
        <div className="card">
          <div className="card-title">Assign Training Plan</div>
          <form onSubmit={saveTrainingPlan}>
            <div className="form-group">
              <label className="form-label">Plan Name</label>
              <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="e.g. Upper/Lower Split" />
            </div>

            {splitDays.map((day, dayIdx) => (
              <div key={dayIdx} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                  <input
                    value={day.day}
                    onChange={(e) => updateDayName(dayIdx, e.target.value)}
                    placeholder="Day name (e.g. Upper A)"
                    style={{ fontWeight: 700 }}
                  />
                  <button type="button" className="remove-x" onClick={() => removeSplitDay(dayIdx)}>×</button>
                </div>

                {(day.exercises || []).map((ex, exIdx) => (
                  <div key={exIdx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <input
                      value={ex.name}
                      onChange={(e) => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                      placeholder="Exercise name"
                      style={{ flex: 2 }}
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
                    <button type="button" className="remove-x" onClick={() => removeExercise(dayIdx, exIdx)}>×</button>
                  </div>
                ))}

                <button type="button" className="btn-small" onClick={() => addExercise(dayIdx)}>+ Add Exercise</button>
              </div>
            ))}

            <button type="button" className="btn-secondary" onClick={addSplitDay} style={{ marginBottom: 16 }}>
              + Add Training Day
            </button>

            <button className="btn-primary" type="submit" disabled={tBusy}>
              {tBusy ? 'Saving…' : 'Save Training Plan'}
            </button>
            {tSaved && <div className="success-text">Plan saved and active for this client.</div>}
          </form>
        </div>
      )}
    </div>
  )
}
