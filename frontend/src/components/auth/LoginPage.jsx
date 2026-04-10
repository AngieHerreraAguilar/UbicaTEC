import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  validateEmail,
  sendVerificationCode,
  verifyCode,
} from '../../services/authService'
import './LoginPage.css'

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = params.get('redirect') || '/mapa'
  const action = params.get('action') // 'join' | 'create' | null

  const [step, setStep] = useState('email') // 'email' | 'code' | 'success'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    const v = validateEmail(email)
    if (!v.valid) { setError(v.error); return }
    setLoading(true)
    try {
      await sendVerificationCode(email)
      setStep('code')
    } catch {
      setError('Error al enviar el código. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    if (!code || code.length !== 6) { setError('El código debe tener 6 dígitos'); return }
    setLoading(true)
    try {
      const result = await verifyCode(email, code)
      if (!result.success) { setError(result.error || 'Código inválido'); return }
      setStep('success')
      setTimeout(() => navigate(redirect, { replace: true }), 1200)
    } catch {
      setError('Error al verificar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const actionText =
    action === 'join' ? 'Inicia sesión para unirte al evento'
    : action === 'create' ? 'Inicia sesión para crear un evento'
    : 'Accede con tu correo institucional'

  return (
    <div className="login-page device-frame">
      <button
        type="button"
        className="login-page__back"
        onClick={() => navigate(-1)}
        aria-label="Volver"
      >
        <i className="fi fi-rr-angle-left" />
      </button>

      <div className="login-page__brand">
        <h1>Ubica<span className="accent">TEC</span></h1>
      </div>

      {step === 'email' && (
        <form className="login-form" onSubmit={handleSendCode}>
          <h2>Iniciar sesión</h2>
          <p className="login-form__sub">{actionText}</p>
          <label className="field">
            <span>Correo institucional</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@estudiantec.cr"
            />
          </label>
          {error && <p className="login-form__error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar código'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="login-form" onSubmit={handleVerify}>
          <h2>Código de verificación</h2>
          <p className="login-form__sub">Ingresa el código enviado a <strong>{email}</strong></p>
          <label className="field">
            <span>Código de 6 dígitos</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="code-input"
            />
          </label>
          {error && <p className="login-form__error">{error}</p>}
          <p className="login-form__hint">STUB: usa <code>123456</code></p>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verificando...' : 'Verificar código'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => { setStep('email'); setCode(''); setError('') }}
          >
            Cambiar correo
          </button>
        </form>
      )}

      {step === 'success' && (
        <div className="login-form login-form--success">
          <div className="login-form__check">
            <i className="fi fi-sr-check" />
          </div>
          <h2>¡Bienvenida/o!</h2>
          <p className="login-form__sub">Sesión iniciada como <strong>{email}</strong></p>
        </div>
      )}
    </div>
  )
}
