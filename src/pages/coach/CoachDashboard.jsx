import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

// ═══════════════════════════════════════════════════════════
// COACH DASHBOARD — V2 visual upgrade.
// All state, data-loading logic, and Supabase calls are
// identical to the working Phase 1 version. Only the JSX
// return block was replaced to match the V2 design language.
// ═══════════════════════════════════════════════════════════

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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Top bar ── */}
      <div style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--v3), var(--v))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px' }}>Physique OS</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'var(--text3)', marginTop: 1 }}>Coach Portal</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{profile?.full_name}</span>
            <button
              onClick={signOut}
              style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700 }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page heading row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.7px' }}>Clients</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>
              {clients.length} {clients.length === 1 ? 'client' : 'clients'} on your roster
            </div>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(''); setInfo('') }}
            style={{
              background: showForm ? 'var(--bg4)' : 'linear-gradient(135deg, var(--v3), var(--v))',
              color: showForm ? 'var(--text2)' : '#fff',
              border: showForm ? '1px solid var(--border2)' : 'none',
              borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 800,
              boxShadow: showForm ? 'none' : '0 4px 18px rgba(124,110,245,.35)',
            }}
          >
            {showForm ? '✕ Cancel' : '+ New Client'}
          </button>
        </div>

        {/* Create client form */}
        {showForm && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--vbrd)', borderRadius: 18,
            padding: '24px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--v2)', marginBottom: 20 }}>
              New Client Account
            </div>
            <form onSubmit={createClient}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }}>Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Client's full name" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="client@email.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }}>Temporary Password</label>
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required placeholder="Min 6 characters" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }}>Start Weight (lbs)</label>
                  <input type="number" step="0.1" value={startWeight} onChange={(e) => setStartWeight(e.target.value)} placeholder="e.g. 231.0" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }}>Goal Weight (lbs)</label>
                  <input type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} placeholder="e.g. 215.0" />
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={busy}
                type="submit"
                style={{ maxWidth: 280 }}
              >
                {busy ? 'Creating account…' : 'Create Client Account'}
              </button>
              {error && <div className="error-text" style={{ marginTop: 12 }}>{error}</div>}
              {info && <div className="success-text" style={{ marginTop: 12 }}>✓ {info}</div>}
            </form>
          </div>
        )}

        {/* Client list */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18 }}>
          {loading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>Loading clients…</div>
          )}

          {!loading && clients.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No clients yet</div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>Click "+ New Client" to create your first client account.</div>
            </div>
          )}

          {!loading && clients.length > 0 && clients.map((c, idx) => {
            const isLast = idx === clients.length - 1
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/coach/clients/${c.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 24px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background .12s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: 'var(--vbg)', border: '1px solid var(--vbrd)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: 'var(--v2)',
                }}>
                  {c.full_name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Name + email */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{c.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Goal: {c.goal_weight ? `${c.goal_weight} lbs` : 'Not set'}
                    {c.start_weight ? ` · Started at ${c.start_weight} lbs` : ''}
                  </div>
                </div>

                {/* Latest weight */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.4px' }}>
                    {c.lastWeight ? `${Number(c.lastWeight.weight).toFixed(1)}` : '—'}
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}> lbs</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {c.lastWeight ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, background: 'var(--gbg)', color: 'var(--g)',
                        border: '1px solid var(--gbrd)', borderRadius: 6, padding: '2px 8px',
                      }}>
                        {c.lastWeight.log_date}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, background: 'var(--abg)', color: 'var(--a)',
                        border: '1px solid var(--abrd)', borderRadius: 6, padding: '2px 8px',
                      }}>
                        No logs yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
