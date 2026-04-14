// Role Service — integrado con authService real
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
