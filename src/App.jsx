import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import ClientDashboard from './pages/client/ClientDashboard'
import CoachDashboard from './pages/coach/CoachDashboard'
import ClientDetail from './pages/coach/ClientDetail'

function FullScreenLoader() {
  return (
    <div className="center-screen">
      <div className="muted">Loading…</div>
    </div>
  )
}

function ProfileErrorScreen({ onRetry, onSignOut }) {
  const [busy, setBusy] = useState(false)
  async function handleRetry() {
    setBusy(true)
    try { await onRetry() } finally { setBusy(false) }
  }
  return (
    <div className="center-screen">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-logo">
          <div className="name">The Rebuild</div>
          <div className="sub">Something went wrong</div>
        </div>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          We couldn't load your profile. Check your connection and try again.
        </p>
        <button className="btn-primary" onClick={handleRetry} disabled={busy}>
          {busy ? 'Trying…' : 'Try again'}
        </button>
        <button className="btn-secondary" onClick={onSignOut} style={{ marginTop: 10 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}

function RequireAuth({ children, role }) {
  const { session, profile, profileError, loading, refreshProfile, signOut } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    // Session exists but the profile didn't load — never guess the role
    // and never redirect-loop. Show the loader while a fetch is in
    // flight, the error screen once it has actually failed.
    if (profileError) {
      return <ProfileErrorScreen onRetry={refreshProfile} onSignOut={signOut} />
    }
    return <FullScreenLoader />
  }
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/app'} replace />
  }
  return children
}

function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={profile?.role === 'coach' ? '/coach' : '/app'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <RequireAuth role="client">
            <ClientDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/coach"
        element={
          <RequireAuth role="coach">
            <CoachDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/coach/clients/:clientId"
        element={
          <RequireAuth role="coach">
            <ClientDetail />
          </RequireAuth>
        }
      />

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
