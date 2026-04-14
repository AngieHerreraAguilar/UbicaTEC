// Auth Service — rutas a través del API Gateway (Persona 2)

const API_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL
const API_KEY = import.meta.env.VITE_API_KEY
const AUTH_URL = `${API_GATEWAY}/auth`

const ALLOWED_DOMAINS = ['estudiantec.cr', 'itcr.ac.cr']
const ADMIN_EMAILS = ['admin@itcr.ac.cr', 'profesor@itcr.ac.cr']

const AUTH_EVENT = 'ubicatec:auth-change'
export function onAuthChange(handler) {
  window.addEventListener(AUTH_EVENT, handler)
  return () => window.removeEventListener(AUTH_EVENT, handler)
}
function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function validateEmail(email) {
  if (!email || !email.includes('@')) {
    return { valid: false, error: 'Correo inválido' }
  }
  const domain = email.split('@')[1]
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return {
      valid: false,
      error: 'Solo se permiten correos @estudiantec.cr o @itcr.ac.cr',
    }
  }
  return { valid: true, error: null }
}

export function getRole(email) {
  return ADMIN_EMAILS.includes(email) ? 'admin' : 'estudiante'
}

export async function sendVerificationCode(email) {
  const response = await fetch(`${AUTH_URL}/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': API_KEY,
    },
    body: JSON.stringify({ email }),
  })
  return response.json()
}

export async function verifyCode(email, code) {
  const response = await fetch(`${AUTH_URL}/verify-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': API_KEY,
    },
    body: JSON.stringify({ email, code }),
  })
  const data = await response.json()
  if (data.success && data.token) {
    // TEMPORAL (Fase I): el mock siempre devuelve el mismo rol.
    // Usamos getRole() para determinar el rol a partir del email real.
    // En Fase II con backend real, usar data.user.role directamente.
    const realRole = getRole(email)
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_email', email)
    localStorage.setItem('user_role', realRole)
    emitAuthChange()
  }
  return data
}

export function getCurrentUser() {
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  return {
    token,
    email: localStorage.getItem('user_email'),
    role: localStorage.getItem('user_role'),
    isAdmin: localStorage.getItem('user_role') === 'admin',
  }
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_email')
  localStorage.removeItem('user_role')
  emitAuthChange()
}

export function isAuthenticated() {
  return !!localStorage.getItem('auth_token')
}
