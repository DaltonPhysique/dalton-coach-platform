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

function RequireAuth({ children, role }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'coach' ? '/coach' : '/app'} replace />
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
