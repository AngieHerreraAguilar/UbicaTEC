import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ action }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    const params = new URLSearchParams()
    params.set('redirect', location.pathname + location.search)
    if (action) params.set('action', action)
    return <Navigate to={`/login?${params.toString()}`} replace />
  }
  return <Outlet />
}
