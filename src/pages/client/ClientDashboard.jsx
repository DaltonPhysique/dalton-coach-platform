import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import V2Header from './components/V2Header'
import BottomNav from './components/BottomNav'
import HomeScreen from './screens/HomeScreen'
import InsightsScreen from './screens/InsightsScreen'
import BodyScreen from './screens/BodyScreen'
import ProgressScreen from './screens/ProgressScreen'
import FuelScreen from './screens/FuelScreen'
import TrainScreen from './screens/TrainScreen'
import LogbookScreen from './screens/LogbookScreen'
import RecoveryScreen from './screens/RecoveryScreen'
import SystemScreen from './screens/SystemScreen'

// ════════════════════════════════════════════════════════════
// CLIENT DASHBOARD — V2 visual/structural upgrade.
//
// All data-loading logic below (loadWeights, loadNutritionPlan,
// loadTrainingPlan, loadPhotos, logWeight, handlePhotoUpload) is
// copied unchanged from the working Phase 1 version. No Supabase
// table, query, or backend behavior was modified in this pass.
// Only the screens/components rendering that data were replaced.
// ════════════════════════════════════════════════════════════

export default function ClientDashboard() {
  const { profile, signOut } = useAuth()
  const [activeNav, setActiveNav] = useState('home')

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
    <div className="app-shell" style={{ paddingBottom: 110 }}>
      <V2Header fullName={profile?.full_name} />

      {activeNav === 'home' && (
        <HomeScreen
          profile={profile}
          latest={latest}
          avg7={avg7}
          goalWeight={goalWeight}
          startWeight={startWeight}
          progressPct={progressPct}
          nutritionPlan={nutritionPlan}
          dayType={dayType}
          setDayType={setDayType}
        />
      )}

      {activeNav === 'insights' && <InsightsScreen />}

      {activeNav === 'body' && (
        <BodyScreen
          photos={photos}
          photoBusy={photoBusy}
          photoError={photoError}
          onPhotoUpload={handlePhotoUpload}
        />
      )}

      {activeNav === 'progress' && (
        <ProgressScreen
          weights={weights}
          avg7={avg7}
          weightInput={weightInput}
          setWeightInput={setWeightInput}
          weightBusy={weightBusy}
          onLogWeight={logWeight}
        />
      )}

      {activeNav === 'fuel' && (
        <FuelScreen nutritionPlan={nutritionPlan} dayType={dayType} setDayType={setDayType} />
      )}

      {activeNav === 'train' && <TrainScreen trainingPlan={trainingPlan} />}

      {activeNav === 'log' && <LogbookScreen />}

      {activeNav === 'recovery' && <RecoveryScreen />}

      {activeNav === 'system' && <SystemScreen />}

      <div style={{ textAlign: 'center', margin: '24px 0' }}>
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
      </div>

      <BottomNav active={activeNav} onChange={setActiveNav} />
    </div>
  )
}
