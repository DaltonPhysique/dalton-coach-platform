import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'forgot' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError('')
        setInfo('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

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

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Reset link sent. Check your email (and spam folder).')
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setInfo('Password updated. Sign in with your new password below.')
    setMode('signin')
    setNewPassword('')
  }

  // NOTE: public coach signup was removed Oct 2026 (spam vector).
  // New coach accounts are created from inside the coach dashboard
  // (+ New Coach), which requires an existing coach session.

  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="name">The Rebuild</div>
          <div className="sub">Coach Platform</div>
        </div>

        <div className="card">
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
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setInfo('') }}
                  style={{ background: 'none', color: 'var(--v2)', fontSize: 13, fontWeight: 600 }}
                >
                  Forgot password?
                </button>
              </div>
              {error && <div className="error-text">{error}</div>}
              {info && <div className="success-text">{info}</div>}
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              <p className="muted" style={{ marginBottom: 14 }}>
                Enter your account email and we'll send you a reset link.
              </p>
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
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? 'Sending…' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(''); setInfo('') }}
                  style={{ background: 'none', color: 'var(--v2)', fontSize: 13, fontWeight: 600 }}
                >
                  ← Back to sign in
                </button>
              </div>
              {error && <div className="error-text">{error}</div>}
              {info && <div className="success-text">{info}</div>}
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset}>
              <p className="muted" style={{ marginBottom: 14 }}>
                Choose a new password for your account.
              </p>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <button className="btn-primary" disabled={busy} type="submit">
                {busy ? 'Updating…' : 'Update Password'}
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
