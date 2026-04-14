import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  validateEmail,
  sendVerificationCode,
  verifyCode,
} from '../../services/authService'
import arrowRight from '../../assets/icon-arrow-right.svg'
import './LoginPage.css'

const CODE_LENGTH = 6

export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirect = params.get('redirect') || '/mapa'

  const [step, setStep] = useState('email') // 'email' | 'code' | 'success'
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const blurTimer = useRef(null)
  const codeRefs = useRef([])

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
      setError('Error al enviar el código.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const codeStr = code.join('')
    if (codeStr.length !== CODE_LENGTH) { setError('Ingresa los 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      const result = await verifyCode(email, codeStr)
      if (!result.success) { setError(result.error || 'Código inválido'); return }
      setStep('success')
      setTimeout(() => navigate(redirect, { replace: true }), 1500)
    } catch {
      setError('Error al verificar.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when all digits filled
  useEffect(() => {
    if (code.every((d) => d !== '')) handleVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const handleCodeInput = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    if (value && index < CODE_LENGTH - 1) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = [...code]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setCode(next)
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1)
    codeRefs.current[focusIdx]?.focus()
  }

  return (
    <div className="login device-frame">
      {/* Top bar */}
      <div className="login__topbar">
        <button type="button" className="login__back" onClick={() => navigate(-1)} aria-label="Volver">
          <i className="fi fi-rr-arrow-small-left" />
        </button>
        <span className="login__topbar-text">Volver a vista pública</span>
      </div>

      {/* Brand header — hides when typing */}
      <div className={'login__brand' + (inputFocused ? ' is-hidden' : '')}>
        <div className="login__brand-icon">
          <i className="fi fi-sr-shield-check" />
        </div>
        <h1 className="login__brand-title">
          Ubica<span className="accent">TEC</span>
        </h1>
        <p className="login__brand-sub">PANEL DE ACCESO A EVENTOS</p>
      </div>

      {/* ═══ Step: Email ═══ */}
      {step === 'email' && (
        <form className="login__card" onSubmit={handleSendCode}>
          <h2 className={'login__card-title' + (inputFocused ? ' is-hidden' : '')}>Iniciar Sesión</h2>
          <p className={'login__card-desc' + (inputFocused ? ' is-hidden' : '')}>
            Acceso exclusivo para el personal o estudiantes del ITCR.
          </p>

          <div className="login__field">
            <span className="login__field-label">CORREO INSTITUCIONAL</span>
            <div className={'login__input-wrap' + (error ? ' has-error' : '')}>
              <i className="fi fi-rr-at" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="usuario@estudiantec.cr"
              />
            </div>
          </div>

          {error && <p className="login__error">{error}</p>}

          <button type="submit" className="login__btn" disabled={loading}>
            <span>{loading ? 'Enviando...' : 'Acceder al Panel'}</span>
            {!loading && <img src={arrowRight} alt="" className="login__btn-arrow" />}
          </button>
        </form>
      )}

      {/* ═══ Step: Code ═══ */}
      {step === 'code' && (
        <div className="login__card">
          <div className={'login__card-header' + (inputFocused ? ' is-hidden' : '')}>
            <button type="button" className="login__card-back" onClick={() => { setStep('email'); setCode(Array(CODE_LENGTH).fill('')); setError('') }}>
              <i className="fi fi-rr-arrow-small-left" />
            </button>
            <h2 className="login__card-title">Ingresa tu código</h2>
          </div>
          <p className={'login__card-desc' + (inputFocused ? ' is-hidden' : '')}>
            Por favor, ingresa el código de 6 dígitos enviado a tu correo institucional para acceder al panel administrativo.
          </p>

          <div className="login__field">
            <span className="login__field-label">CÓDIGO DE VERIFICACIÓN</span>
            <div className="login__code-boxes" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <div key={i} className={'login__code-slot' + (digit ? ' is-filled' : '')}>
                  <input
                    ref={(el) => { codeRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="login__code-input"
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onFocus={() => { clearTimeout(blurTimer.current); setInputFocused(true) }}
                    onBlur={() => { blurTimer.current = setTimeout(() => setInputFocused(false), 100) }}
                  />
                  {!digit && <span className="login__code-dot" />}
                </div>
              ))}
            </div>
          </div>

          <p className="login__resend">
            ¿No recibiste el código? <button type="button" className="login__resend-link" onClick={handleSendCode}>Reenviar</button>
          </p>

          {error && <p className="login__error">{error}</p>}

          <button type="button" className="login__btn" onClick={handleVerify} disabled={loading}>
            <span>{loading ? 'Verificando...' : 'Acceder al Panel'}</span>
            {!loading && <img src={arrowRight} alt="" className="login__btn-arrow" />}
          </button>
        </div>
      )}

      {/* ═══ Step: Success ═══ */}
      {step === 'success' && (
        <div className="login__card login__card--success">
          <div className="login__success-check"><i className="fi fi-sr-check" /></div>
          <h2 className="login__card-title">¡Bienvenida/o!</h2>
          <p className="login__card-desc">Sesión iniciada como <strong>{email}</strong></p>
        </div>
      )}
    </div>
  )
}
