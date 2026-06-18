import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

export default function CoachDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [startWeight, setStartWeight] = useState('')
  const [goalWeight, setGoalWeight] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (profile) loadClients()
  }, [profile])

  async function loadClients() {
    setLoading(true)
    const { data: clientProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    if (error || !clientProfiles) {
      setLoading(false)
      return
    }

    const withWeights = await Promise.all(
      clientProfiles.map(async (c) => {
        const { data: lastWeight } = await supabase
          .from('weight_logs')
          .select('weight, log_date')
          .eq('client_id', c.id)
          .order('log_date', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { ...c, lastWeight }
      })
    )

    setClients(withWeights)
    setLoading(false)
  }

  async function createClient(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    // Create the client's auth account. They'll be sent a confirmation
    // email (if email confirmations are on) where they can set in.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'client',
          full_name: fullName,
          coach_id: profile.id,
          start_weight: startWeight || null,
          goal_weight: goalWeight || null,
        },
      },
    })

    setBusy(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setInfo(`Client account created for ${fullName}. Share their email + password with them directly.`)
    setFullName('')
    setEmail('')
    setPassword('')
    setStartWeight('')
    setGoalWeight('')
    setShowForm(false)
    loadClients()
  }

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <div className="brand">
          {profile?.full_name}
          <span>Coach Dashboard</span>
        </div>
        <button className="signout-btn" onClick={signOut}>Sign Out</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ marginBottom: 0 }}>Your Clients</span>
          <button className="btn-small" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Client'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createClient} style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Start Weight (lbs)</label>
                <input type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Goal Weight (lbs)</label>
                <input type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
              </div>
            </div>
            <button className="btn-primary" disabled={busy} type="submit">
              {busy ? 'Creating…' : 'Create Client Account'}
            </button>
            {error && <div className="error-text">{error}</div>}
            {info && <div className="success-text">{info}</div>}
          </form>
        )}

        {loading && <div className="muted">Loading clients…</div>}

        {!loading && clients.length === 0 && (
          <div className="empty-state">
            <div className="icon">👋</div>
            No clients yet. Create your first client account above.
          </div>
        )}

        {!loading && clients.length > 0 && (
          <table className="client-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Latest Weight</th>
                <th>Last Logged</th>
                <th>Goal</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/coach/clients/${c.id}`)}>
                  <td className="client-name">{c.full_name}</td>
                  <td>{c.lastWeight ? `${Number(c.lastWeight.weight).toFixed(1)} lbs` : '—'}</td>
                  <td>
                    {c.lastWeight ? (
                      <span className="badge badge-green">{c.lastWeight.log_date}</span>
                    ) : (
                      <span className="badge badge-amber">No logs</span>
                    )}
                  </td>
                  <td>{c.goal_weight ? `${c.goal_weight} lbs` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
