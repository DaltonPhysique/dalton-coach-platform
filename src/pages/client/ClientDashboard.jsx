import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

const ANGLES = ['front', 'side', 'back']

export default function ClientDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('dashboard')

  const [weights, setWeights] = useState([])
  const [weightInput, setWeightInput] = useState('')
  const [weightBusy, setWeightBusy] = useState(false)

  const [nutritionPlan, setNutritionPlan] = useState(null)
  const [dayType, setDayType] = useState('training')

  const [trainingPlan, setTrainingPlan] = useState(null)

  const [photos, setPhotos] = useState({ front: [], side: [], back: [] })
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    if (!profile) return
    loadWeights()
    loadNutritionPlan()
    loadTrainingPlan()
    loadPhotos()
  }, [profile])

  async function loadWeights() {
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('client_id', profile.id)
      .order('log_date', { ascending: false })
      .limit(14)
    if (!error) setWeights(data || [])
  }

  async function loadNutritionPlan() {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('client_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!error) setNutritionPlan(data)
  }

  async function loadTrainingPlan() {
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('client_id', profile.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!error) setTrainingPlan(data)
  }

  async function loadPhotos() {
    const { data, error } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('client_id', profile.id)
      .order('log_date', { ascending: false })
    if (error || !data) return
    const grouped = { front: [], side: [], back: [] }
    for (const p of data) {
      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(p.storage_path, 60 * 60)
      grouped[p.angle]?.push({ ...p, url: signed?.signedUrl })
    }
    setPhotos(grouped)
  }

  async function logWeight(e) {
    e.preventDefault()
    const val = parseFloat(weightInput)
    if (!val || val < 50 || val > 600) return
    setWeightBusy(true)
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from('weight_logs')
      .upsert({ client_id: profile.id, log_date: today, weight: val }, { onConflict: 'client_id,log_date' })
    setWeightInput('')
    await loadWeights()
    setWeightBusy(false)
  }

  async function handlePhotoUpload(angle, file) {
    if (!file) return
    setPhotoError('')
    setPhotoBusy(true)
    const today = new Date().toISOString().slice(0, 10)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${profile.id}/${angle}/${today}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setPhotoError(uploadError.message)
      setPhotoBusy(false)
      return
    }

    await supabase.from('progress_photos').insert({
      client_id: profile.id,
      angle,
      storage_path: path,
      log_date: today,
    })

    await loadPhotos()
    setPhotoBusy(false)
  }

  const latest = weights[0]
  const avg7 = weights.length
    ? weights.slice(0, 7).reduce((a, w) => a + Number(w.weight), 0) / Math.min(weights.length, 7)
    : null
  const startWeight = profile?.start_weight
  const goalWeight = profile?.goal_weight
  const progressPct =
    startWeight && goalWeight && avg7
      ? Math.min(100, Math.max(0, ((startWeight - avg7) / (startWeight - goalWeight)) * 100))
      : null

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          {profile?.full_name}
          <span>Client Dashboard</span>
        </div>
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`tab-btn ${tab === 'nutrition' ? 'active' : ''}`} onClick={() => setTab('nutrition')}>Nutrition</button>
        <button className={`tab-btn ${tab === 'training' ? 'active' : ''}`} onClick={() => setTab('training')}>Training</button>
        <button className={`tab-btn ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>Photos</button>
      </div>

      {tab === 'dashboard' && (
        <>
          <div className="card">
            <div className="card-title">Weight Tracking</div>
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

            {goalWeight && (
              <div style={{ marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 8 }}>
                  Progress to {goalWeight} lbs
                </div>
                <div style={{ height: 8, background: 'var(--bg6)', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPct ?? 0}%`,
                      background: 'linear-gradient(90deg, var(--v3), var(--v), #00cba9)',
                      borderRadius: 6,
                      transition: 'width .5s ease',
                    }}
                  />
                </div>
              </div>
            )}

            <form onSubmit={logWeight} className="weight-row">
              <input
                type="number"
                step="0.1"
                placeholder="231.0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
              <button className="btn-small" type="submit" disabled={weightBusy} style={{ flexShrink: 0 }}>
                {weightBusy ? 'Logging…' : 'Log Weight'}
              </button>
            </form>

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

      {tab === 'nutrition' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ marginBottom: 0 }}>Nutrition Targets</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`tab-btn ${dayType === 'training' ? 'active' : ''}`}
                style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={() => setDayType('training')}
              >
                Training
              </button>
              <button
                className={`tab-btn ${dayType === 'rest' ? 'active' : ''}`}
                style={{ fontSize: 11, padding: '5px 10px' }}
                onClick={() => setDayType('rest')}
              >
                Rest
              </button>
            </div>
          </div>

          {!nutritionPlan && (
            <div className="empty-state">
              <div className="icon">🍽️</div>
              Your coach hasn't assigned a nutrition plan yet.
            </div>
          )}

          {nutritionPlan && (
            <div className="macro-row">
              <div className="macro-chip">
                <div className="v">{dayType === 'training' ? nutritionPlan.training_cal : nutritionPlan.rest_cal}</div>
                <div className="l">kcal</div>
              </div>
              <div className="macro-chip">
                <div className="v" style={{ color: 'var(--v2)' }}>
                  {dayType === 'training' ? nutritionPlan.training_protein : nutritionPlan.rest_protein}g
                </div>
                <div className="l">protein</div>
              </div>
              <div className="macro-chip">
                <div className="v" style={{ color: 'var(--g)' }}>
                  {dayType === 'training' ? nutritionPlan.training_carbs : nutritionPlan.rest_carbs}g
                </div>
                <div className="l">carbs</div>
              </div>
              <div className="macro-chip">
                <div className="v" style={{ color: 'var(--a)' }}>
                  {dayType === 'training' ? nutritionPlan.training_fat : nutritionPlan.rest_fat}g
                </div>
                <div className="l">fat</div>
              </div>
            </div>
          )}

          {nutritionPlan?.notes && (
            <div className="muted" style={{ lineHeight: 1.6 }}>{nutritionPlan.notes}</div>
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="card">
          <div className="card-title">{trainingPlan?.name || 'Training Plan'}</div>
          {!trainingPlan && (
            <div className="empty-state">
              <div className="icon">🏋️</div>
              Your coach hasn't assigned a training plan yet.
            </div>
          )}
          {trainingPlan && (
            <div>
              {(trainingPlan.split_json || []).map((day, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div className="split-day" style={{ borderBottom: 'none', paddingBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{day.day}</span>
                    <span className="muted">{day.exercises?.length || 0} exercises</span>
                  </div>
                  {(day.exercises || []).map((ex, j) => (
                    <div className="exercise-row" key={j}>
                      <div className="name">{ex.name}</div>
                      <div className="meta">{ex.sets} × {ex.reps} reps</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
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
                  <label className="photo-slot">
                    {latestPhoto ? (
                      <img src={latestPhoto.url} alt={angle} />
                    ) : (
                      <div className="placeholder">
                        <div className="icon">📸</div>
                        Add
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(angle, e.target.files?.[0])}
                    />
                  </label>
                  <div className="photo-angle-label">{angle}</div>
                </div>
              )
            })}
          </div>
          {photoBusy && <div className="muted">Uploading…</div>}
          {photoError && <div className="error-text">{photoError}</div>}
          <div className="muted" style={{ marginTop: 10 }}>
            Tap a photo slot to upload. Same lighting, same pose, every time — that's what makes photos useful.
          </div>
        </div>
      )}
    </div>
  )
}
