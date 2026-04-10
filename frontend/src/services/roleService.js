// Role Service — STUB temporal (mirror del de Persona 3)
import { getCurrentUser } from './authService'

export function canCreateEvent() {
  const user = getCurrentUser()
  return !!user && user.role === 'admin'
}

export function canEditEvent() {
  const user = getCurrentUser()
  return !!user && user.role === 'admin'
}

export function canDeleteEvent() {
  const user = getCurrentUser()
  return !!user && user.role === 'admin'
}
