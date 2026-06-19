import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

// ─── style constants ──────────────────────────────────────────────────────────
const EYEBROW = {
  fontSize: 10, fontWeight: 800, letterSpacing: '1.3px',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6,
}
const LBL = {
  display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7,
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000)
}
function avg(arr) {
  if (!arr?.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
}
function sparkColor(delta) {
  if (delta === null) return 'var(--text3)'
  return delta <= 0 ? 'var(--g)' : 'var(--r)'
}

// ─── compute alert flags for one client ──────────────────────────────────────
function computeAlerts(c) {
  const alerts = []

  // Weight stalled 14+ days
  if (c.wlogs?.length >= 2) {
    const sorted = [...c.wlogs].sort((a, b) => b.log_date.localeCompare(a.log_date))
    const last14 = sorted.slice(0, 14)
    if (last14.length >= 14) {
      const first7avg = avg(last14.slice(0, 7).map(w => Number(w.weight)))
      const prev7avg  = avg(last14.slice(7).map(w => Number(w.weight)))
      if (first7avg !== null && prev7avg !== null && Math.abs(first7avg - prev7avg) < 0.5) {
        alerts.push({ type: 'weight_stalled', label: 'Weight stalled 14+ days', severity: 'amber' })
      }
    }
  }

  // Recovery avg below 6/10 (score out of 30; threshold = 18 out of 30) for 3+ days
  if (c.recLogs?.length >= 3) {
    const recent3 = [...c.recLogs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 3)
    const avgRec = avg(recent3.map(r => r.sleep + r.energy + r.soreness + r.stress + r.digestion + r.motivation))
    if (avgRec !== null && avgRec < 18) {
      alerts.push({ type: 'recovery_low', label: `Recovery avg ${avgRec.toFixed(0)}/30 (3-day)`, severity: 'red' })
    }
  }

  // Motivation avg below 3/5 for 3+ days
  if (c.recLogs?.length >= 3) {
    const recent3 = [...c.recLogs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 3)
    const avgMot  = avg(recent3.map(r => r.motivation).filter(Boolean))
    if (avgMot !== null && avgMot < 3) {
      alerts.push({ type: 'motivation_low', label: `Motivation avg ${avgMot.toFixed(1)}/5 (3-day)`, severity: 'red' })
    }
  }

  // Compliance below 80%
  if (c.stats?.compliance_pct !== null && c.stats?.compliance_pct < 80) {
    alerts.push({ type: 'compliance_low', label: `Compliance ${c.stats.compliance_pct}%`, severity: 'amber' })
  }

  // No weight log in 7+ days
  if (daysSince(c.wlogs?.[0]?.log_date) >= 7) {
    alerts.push({ type: 'no_log', label: `No log in ${daysSince(c.wlogs?.[0]?.log_date) === Infinity ? 'ever' : daysSince(c.wlogs?.[0]?.log_date) + ' days'}`, severity: 'amber' })
  }

  return alerts
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CoachDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [clients,   setClients]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)

  const [fullName,    setFullName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [startWeight, setStartWeight] = useState('')
  const [goalWeight,  setGoalWeight]  = useState('')
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState('')
  const [info,        setInfo]        = useState('')

  useEffect(() => { if (profile) loadClients() }, [profile])

  async function loadClients() {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('profiles').select('*')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
    if (!profiles) { setLoading(false); return }

    const enriched = await Promise.all(profiles.map(async (c) => {
      // Weight logs (14 days)
      const { data: wlogs } = await supabase
        .from('weight_logs').select('weight, log_date')
        .eq('client_id', c.id).order('log_date', { ascending: false }).limit(14)

      // Recovery logs (7 days from new table — graceful if table missing)
      const { data: recLogs } = await supabase
        .from('coach_recovery_logs').select('*')
        .eq('client_id', c.id).order('log_date', { ascending: false }).limit(7)

      // Coach client stats
      const { data: stats } = await supabase
        .from('coach_client_stats').select('*')
        .eq('client_id', c.id).maybeSingle()

      // Active nutrition plan
      const { data: nutPlan } = await supabase
        .from('nutrition_plans').select('training_cal, rest_cal')
        .eq('client_id', c.id).eq('active', true).limit(1).maybeSingle()

      // Active training plan
      const { data: trainPlan } = await supabase
        .from('training_plans').select('name')
        .eq('client_id', c.id).eq('active', true).limit(1).maybeSingle()

      const sorted = [...(wlogs || [])].sort((a, b) => b.log_date.localeCompare(a.log_date))
      const last7  = sorted.slice(0, 7)
      const prev7  = sorted.slice(7, 14)
      const weeklyDelta = (last7.length && prev7.length)
        ? avg(last7.map(w => Number(w.weight))) - avg(prev7.map(w => Number(w.weight)))
        : null

      const recSorted = [...(recLogs || [])].sort((a, b) => b.log_date.localeCompare(a.log_date))
      const avgRec = recSorted.length
        ? avg(recSorted.slice(0, 7).map(r => r.sleep + r.energy + r.soreness + r.stress + r.digestion + r.motivation))
        : null
      const avgMot = recSorted.length
        ? avg(recSorted.slice(0, 7).map(r => r.motivation).filter(Boolean))
        : null

      const enrichedClient = {
        ...c,
        wlogs: sorted,
        recLogs: recSorted,
        stats: stats ?? null,
        nutPlan: nutPlan ?? null,
        trainPlan: trainPlan ?? null,
        weeklyDelta,
        avgRec,
        avgMot,
        lastWeight: sorted[0] ?? null,
      }
      enrichedClient.alerts = computeAlerts(enrichedClient)
      return enrichedClient
    }))

    // Sort by alert count descending (highest priority first)
    enriched.sort((a, b) => {
      const aRed = a.alerts.filter(x => x.severity === 'red').length
      const bRed = b.alerts.filter(x => x.severity === 'red').length
      if (bRed !== aRed) return bRed - aRed
      return b.alerts.length - a.alerts.length
    })

    setClients(enriched)
    setLoading(false)
  }

  async function createClient(e) {
    e.preventDefault(); setError(''); setInfo(''); setBusy(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'client', full_name: fullName, coach_id: profile.id,
        start_weight: startWeight || null, goal_weight: goalWeight || null } },
    })
    setBusy(false)
    if (signUpError) { setError(signUpError.message); return }
    setInfo(`Account created for ${fullName}. Share their email + password directly.`)
    setFullName(''); setEmail(''); setPassword(''); setStartWeight(''); setGoalWeight('')
    setShowForm(false); loadClients()
  }

  // ── derived globals ────────────────────────────────────────────────────────
  const totalAlerts    = clients.reduce((a, c) => a + c.alerts.length, 0)
  const redAlerts      = clients.reduce((a, c) => a + c.alerts.filter(x => x.severity === 'red').length, 0)
  const activeCount    = clients.length
  const allDeltas      = clients.map(c => c.weeklyDelta).filter(d => d !== null)
  const globalAvgDelta = allDeltas.length ? avg(allDeltas) : null
  const recentActivity = clients
    .filter(c => c.lastWeight)
    .map(c => ({ name: c.full_name, id: c.id, ...c.lastWeight }))
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ═══ TOP BAR ═══ */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 28px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--v3),var(--v))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', lineHeight: 1.2 }}>Physique OS</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'var(--text3)' }}>Coach Portal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {redAlerts > 0 && (
              <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--r)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--r)' }}>{redAlerts} critical alert{redAlerts > 1 ? 's' : ''}</span>
              </div>
            )}
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{profile?.full_name}</span>
            <button onClick={signOut} style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 28px' }}>

        {/* ── Page heading ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.8px', lineHeight: 1.1 }}>Command Center</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 5, fontWeight: 500 }}>
              {loading ? 'Loading roster…' : `${activeCount} ${activeCount === 1 ? 'client' : 'clients'} · ${totalAlerts} active alert${totalAlerts !== 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(''); setInfo('') }}
            style={{
              background: showForm ? 'var(--bg4)' : 'linear-gradient(135deg,var(--v3),var(--v))',
              color: showForm ? 'var(--text2)' : '#fff',
              border: showForm ? '1px solid var(--border2)' : 'none',
              borderRadius: 11, padding: '11px 22px', fontSize: 14, fontWeight: 800,
              boxShadow: showForm ? 'none' : '0 4px 20px rgba(124,110,245,.35)', flexShrink: 0,
            }}
          >
            {showForm ? '✕ Cancel' : '+ New Client'}
          </button>
        </div>

        {/* ── Global KPI bar ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Active Clients', val: activeCount, unit: '', col: 'var(--v2)', accent: 'linear-gradient(90deg,var(--v3),var(--v2))' },
              { label: 'Critical Alerts', val: redAlerts || 0, unit: '', col: redAlerts > 0 ? 'var(--r)' : 'var(--text3)', accent: redAlerts > 0 ? 'linear-gradient(90deg,var(--r2),var(--r))' : 'var(--border)' },
              { label: 'Amber Alerts', val: totalAlerts - redAlerts, unit: '', col: (totalAlerts - redAlerts) > 0 ? 'var(--a)' : 'var(--text3)', accent: (totalAlerts - redAlerts) > 0 ? 'linear-gradient(90deg,var(--a2),var(--a))' : 'var(--border)' },
              { label: 'Avg Weekly Δ', val: globalAvgDelta !== null ? `${globalAvgDelta > 0 ? '+' : ''}${globalAvgDelta.toFixed(1)}` : '—', unit: globalAvgDelta !== null ? 'lbs' : '', col: globalAvgDelta === null ? 'var(--text3)' : globalAvgDelta <= 0 ? 'var(--g)' : 'var(--r)', accent: globalAvgDelta !== null && globalAvgDelta <= 0 ? 'linear-gradient(90deg,var(--g2),var(--g))' : 'var(--border)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.accent }} />
                <div style={EYEBROW}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, color: s.col }}>
                  {s.val}<span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>{s.unit ? ` ${s.unit}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── New client form ── */}
        {showForm && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--vbrd)', borderRadius: 18, padding: '26px 28px', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--v2)', marginBottom: 22 }}>New Client Account</div>
            <form onSubmit={createClient}>
              <div style={{ marginBottom: 14 }}>
                <label style={LBL}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Client's full name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><label style={LBL}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="client@email.com" /></div>
                <div><label style={LBL}>Temporary Password</label><input type="text" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required placeholder="Min 6 chars" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
                <div><label style={LBL}>Start Weight (lbs)</label><input type="number" step="0.1" value={startWeight} onChange={e => setStartWeight(e.target.value)} placeholder="231.0" /></div>
                <div><label style={LBL}>Goal Weight (lbs)</label><input type="number" step="0.1" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="215.0" /></div>
              </div>
              <button className="btn-primary" disabled={busy} type="submit" style={{ maxWidth: 260 }}>
                {busy ? 'Creating…' : 'Create Client Account'}
              </button>
              {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
              {info  && <div className="success-text" style={{ marginTop: 12 }}>✓ {info}</div>}
            </form>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

          {/* ── CLIENT CARDS ── */}
          <div>
            <div style={{ ...EYEBROW, marginBottom: 14 }}>
              Client Roster <span style={{ color: 'var(--text3)', fontSize: 9 }}>· sorted by alert priority</span>
            </div>

            {loading && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '48px', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
            )}
            {!loading && clients.length === 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '52px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No clients yet</div>
                <div style={{ fontSize: 14, color: 'var(--text3)' }}>Click "+ New Client" to add your first.</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {clients.map(c => {
                const progress  = (c.start_weight && c.goal_weight && c.lastWeight)
                  ? Math.min(100, Math.max(0, ((+c.start_weight - +c.lastWeight.weight) / (+c.start_weight - +c.goal_weight)) * 100))
                  : null
                const lostLbs   = (c.start_weight && c.lastWeight) ? (+c.start_weight - +c.lastWeight.weight).toFixed(1) : null
                const toGoLbs   = (c.goal_weight && c.lastWeight)  ? Math.max(0, +c.lastWeight.weight - +c.goal_weight).toFixed(1) : null
                const hasRed    = c.alerts.some(a => a.severity === 'red')
                const hasAmber  = c.alerts.some(a => a.severity === 'amber')
                const borderCol = hasRed ? 'var(--rbrd)' : hasAmber ? 'var(--abrd)' : 'var(--border)'
                const accentGrd = hasRed ? 'linear-gradient(90deg,var(--r2),var(--r))' : hasAmber ? 'linear-gradient(90deg,var(--a2),var(--a))' : 'linear-gradient(90deg,var(--v3),var(--v2))'

                return (
                  <div key={c.id} style={{ background: 'var(--bg2)', border: `1px solid ${borderCol}`, borderRadius: 18, overflow: 'hidden' }}>
                    {/* colour-coded top stripe */}
                    <div style={{ height: 3, background: accentGrd }} />

                    <div style={{ padding: '18px 22px' }}>
                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--vbg)', border: '1px solid var(--vbrd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: 'var(--v2)', flexShrink: 0 }}>
                          {c.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.2px' }}>{c.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>
                            {c.stats?.current_phase || 'No phase set'}
                            {c.start_weight ? ` · Start ${c.start_weight} lbs` : ''}
                            {c.goal_weight ? ` · Goal ${c.goal_weight} lbs` : ''}
                          </div>
                        </div>
                        {c.alerts.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {hasRed && <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--rbg)', color: 'var(--r)', border: '1px solid var(--rbrd)', borderRadius: 7, padding: '4px 9px' }}>
                              ⚠ {c.alerts.filter(a => a.severity === 'red').length} critical
                            </span>}
                            {hasAmber && <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--abg)', color: 'var(--a)', border: '1px solid var(--abrd)', borderRadius: 7, padding: '4px 9px' }}>
                              {c.alerts.filter(a => a.severity === 'amber').length} amber
                            </span>}
                          </div>
                        )}
                      </div>

                      {/* Alert pills */}
                      {c.alerts.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                          {c.alerts.map((alert, i) => (
                            <span key={i} style={{
                              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                              background: alert.severity === 'red' ? 'var(--rbg)' : 'var(--abg)',
                              color: alert.severity === 'red' ? 'var(--r)' : 'var(--a)',
                              border: `1px solid ${alert.severity === 'red' ? 'var(--rbrd)' : 'var(--abrd)'}`,
                            }}>
                              {alert.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Metric grid: Weight / Recovery / Motivation / Compliance */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                        {/* Weight trend */}
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 5 }}>Weight Δ/wk</div>
                          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: sparkColor(c.weeklyDelta) }}>
                            {c.weeklyDelta !== null ? `${c.weeklyDelta > 0 ? '+' : ''}${c.weeklyDelta.toFixed(1)}` : '—'}
                            {c.weeklyDelta !== null && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)' }}> lbs</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>
                            {c.lastWeight ? `${Number(c.lastWeight.weight).toFixed(1)} lbs` : 'No logs'}
                          </div>
                        </div>

                        {/* Recovery */}
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 5 }}>Recovery</div>
                          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: c.avgRec === null ? 'var(--text3)' : c.avgRec >= 22 ? 'var(--g)' : c.avgRec >= 16 ? 'var(--a)' : 'var(--r)' }}>
                            {c.avgRec !== null ? c.avgRec.toFixed(0) : '—'}
                            {c.avgRec !== null && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>/30</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>7-day avg</div>
                        </div>

                        {/* Motivation */}
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 5 }}>Motivation</div>
                          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px', color: c.avgMot === null ? 'var(--text3)' : c.avgMot >= 4 ? 'var(--g)' : c.avgMot >= 3 ? 'var(--a)' : 'var(--r)' }}>
                            {c.avgMot !== null ? c.avgMot.toFixed(1) : '—'}
                            {c.avgMot !== null && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>/5</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>7-day avg</div>
                        </div>

                        {/* Compliance */}
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 10px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 5 }}>Compliance</div>
                          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.4px',
                            color: c.stats?.compliance_pct == null ? 'var(--text3)' : c.stats.compliance_pct >= 90 ? 'var(--g)' : c.stats.compliance_pct >= 70 ? 'var(--a)' : 'var(--r)' }}>
                            {c.stats?.compliance_pct != null ? c.stats.compliance_pct : '—'}
                            {c.stats?.compliance_pct != null && <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>%</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>this week</div>
                        </div>
                      </div>

                      {/* Second row: calories + split */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>Current Cals</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>
                            {c.nutPlan?.training_cal ? `${c.nutPlan.training_cal} train / ${c.nutPlan.rest_cal} rest` : '—'}
                          </div>
                        </div>
                        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.7px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>Training Split</div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{c.trainPlan?.name || '—'}</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {progress !== null && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>
                            <span>Progress to goal</span>
                            <span>{progress.toFixed(0)}% · {lostLbs > 0 ? `${lostLbs} lbs lost` : 'No loss yet'} · {toGoLbs} to go</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--bg5)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--v3),var(--v),#00cba9)', borderRadius: 4 }} />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>
                          {c.lastWeight
                            ? <>Last log: <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{c.lastWeight.log_date}</span></>
                            : 'No weigh-ins yet'}
                          {c.stats?.last_checkin_date && (
                            <> · Check-in: <span style={{ color: 'var(--text2)', fontWeight: 700 }}>{c.stats.last_checkin_date}</span></>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/coach/clients/${c.id}`)}
                          style={{ background: 'var(--vbg)', border: '1px solid var(--vbrd)', color: 'var(--v2)', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700 }}
                        >
                          View Client →
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ position: 'sticky', top: 82, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Recent activity */}
            <div>
              <div style={{ ...EYEBROW, marginBottom: 12 }}>Recent Activity</div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                {recentActivity.length === 0 && (
                  <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No weigh-ins yet.</div>
                )}
                {recentActivity.map((a, i) => (
                  <div
                    key={`${a.id}-${i}`}
                    onClick={() => navigate(`/coach/clients/${a.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--vbg)', border: '1px solid var(--vbrd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--v2)', flexShrink: 0 }}>
                      {a.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{a.log_date}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.3px', flexShrink: 0 }}>
                      {Number(a.weight).toFixed(1)}<span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}> lbs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert summary */}
            {totalAlerts > 0 && (
              <div>
                <div style={{ ...EYEBROW, marginBottom: 12 }}>Alert Summary</div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  {clients.filter(c => c.alerts.length > 0).map((c, i, arr) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/coach/clients/${c.id}`)}
                      style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background .12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{c.full_name}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {c.alerts.map((a, j) => (
                          <div key={j} style={{ fontSize: 11, fontWeight: 600, color: a.severity === 'red' ? 'var(--r)' : 'var(--a)' }}>
                            {a.severity === 'red' ? '⚠' : '!'} {a.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
