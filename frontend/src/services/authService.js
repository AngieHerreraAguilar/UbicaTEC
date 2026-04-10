// Auth Service — STUB temporal
// Este archivo será REEMPLAZADO por el que entregue Persona 1 (Azure API Management mocks).
// API idéntica a la del plan del equipo para que la integración sea drop-in.
// TODO(integración): eliminar stub, colocar authService.js real de Persona 1.

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

// STUB: simula envío de código. El real hace fetch al API.
export async function sendVerificationCode(email) {
  await new Promise((r) => setTimeout(r, 600))
  return {
    success: true,
    message: 'Código enviado (STUB: usa 123456)',
    email,
    expiresIn: 300,
  }
}

// STUB: cualquier código "123456" es válido.
export async function verifyCode(email, code) {
  await new Promise((r) => setTimeout(r, 500))
  if (code !== '123456') {
    return { success: false, error: 'Código inválido o expirado' }
  }
  const role = getRole(email)
  const fakeToken = 'stub.' + btoa(JSON.stringify({ email, role })) + '.sig'
  localStorage.setItem('auth_token', fakeToken)
  localStorage.setItem('user_email', email)
  localStorage.setItem('user_role', role)
  emitAuthChange()
  return { success: true, token: fakeToken, user: { email, role } }
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
