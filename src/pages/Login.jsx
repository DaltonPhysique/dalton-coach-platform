import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'coach-signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  async function handleCoachSignup(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'coach', full_name: fullName },
      },
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Coach account created. Check your email if confirmation is required, then sign in below.')
    setMode('signin')
  }

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="name">Dalton Physique OS</div>
          <div className="sub">Coach Platform</div>
        </div>

        <div className="card">
          <div className="role-toggle">
            <button
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => { setMode('signin'); setError(''); setInfo('') }}
            >
              Sign In
            </button>
            <button
              className={mode === 'coach-signup' ? 'active' : ''}
              onClick={() => { setMode('coach-signup'); setError(''); setInfo('') }}
            >
              New Coach Account
            </button>
          </div>

          {mode === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
              {error && <div className="error-text">{error}</div>}
              {info && <div className="success-text">{info}</div>}
            </form>
          )}

          {mode === 'coach-signup' && (
            <form onSubmit={handleCoachSignup}>
              <p className="muted" style={{ marginBottom: 14 }}>
                Use this once to create your own coach account. Client accounts are created
                from inside the coach dashboard, not here.
              </p>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? 'Creating account…' : 'Create Coach Account'}
              </button>
              {error && <div className="error-text">{error}</div>}
              {info && <div className="success-text">{info}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
