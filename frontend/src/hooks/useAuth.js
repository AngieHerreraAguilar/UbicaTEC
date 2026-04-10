import { useEffect, useState } from 'react'
import { getCurrentUser, onAuthChange } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState(() => getCurrentUser())
  useEffect(() => {
    return onAuthChange(() => setUser(getCurrentUser()))
  }, [])
  return { user, isAuthenticated: !!user, isAdmin: user?.isAdmin === true }
}
