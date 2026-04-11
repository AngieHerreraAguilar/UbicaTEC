import { useState } from 'react'
import './TimePicker.css'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function parse24(time) {
  if (!time) return { h: 12, m: 0, period: 'AM' }
  const [hh, mm] = time.split(':').map(Number)
  return { h: hh % 12 || 12, m: mm, period: hh >= 12 ? 'PM' : 'AM' }
}
function to24(h, m, period) {
  let hh = h % 12
  if (period === 'PM') hh += 12
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function TimePicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const parsed = parse24(value)
  const [hour, setHour] = useState(parsed.h)
  const [minute, setMinute] = useState(parsed.m)
  const [period, setPeriod] = useState(parsed.period)

  const displayText = value
    ? `${parsed.h}:${String(parsed.m).padStart(2, '0')} ${parsed.period}`
    : 'Seleccionar hora'

  const handleConfirm = () => {
    onChange(to24(hour, minute, period))
    setOpen(false)
  }

  const handleOpen = () => {
    const p = parse24(value)
    setHour(p.h)
    setMinute(p.m)
    setPeriod(p.period)
    setOpen(true)
  }

  return (
    <div className="tp">
      <button
        type="button"
        className={'tp__trigger' + (error ? ' has-error' : '') + (value ? ' has-value' : '')}
        onClick={handleOpen}
      >
        <i className="fi fi-rr-clock" />
        <span>{displayText}</span>
      </button>

      {open && (
        <>
          <div className="tp__backdrop" onClick={() => setOpen(false)} />
          <div className="tp__panel">
            <div className="tp__header">
              <span className="tp__title">Seleccionar hora</span>
            </div>
            <div className="tp__columns">
              <div className="tp__col">
                <span className="tp__col-label">Hora</span>
                <div className="tp__scroll">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={'tp__option' + (h === hour ? ' is-selected' : '')}
                      onClick={() => setHour(h)}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tp__col">
                <span className="tp__col-label">Min</span>
                <div className="tp__scroll">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={'tp__option' + (m === minute ? ' is-selected' : '')}
                      onClick={() => setMinute(m)}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tp__col tp__col--period">
                <span className="tp__col-label">&nbsp;</span>
                <div className="tp__scroll">
                  {['AM', 'PM'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={'tp__option' + (p === period ? ' is-selected' : '')}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="tp__footer">
              <button type="button" className="tp__footer-btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button type="button" className="tp__footer-btn tp__footer-btn--accent" onClick={handleConfirm}>Aceptar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
