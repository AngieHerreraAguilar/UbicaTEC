import { useState } from 'react'
import './DatePicker.css'

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function firstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}
function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function DatePicker({ value, onChange, error }) {
  const [open, setOpen] = useState(false)
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const days = daysInMonth(viewYear, viewMonth)
  const offset = firstDayOfMonth(viewYear, viewMonth)
  const prevDays = daysInMonth(viewYear, viewMonth - 1)

  const displayText = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('es-CR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'Seleccionar fecha'

  const handleSelect = (day) => {
    onChange(toISO(viewYear, viewMonth, day))
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  return (
    <div className="dp">
      <button
        type="button"
        className={'dp__trigger' + (error ? ' has-error' : '') + (value ? ' has-value' : '')}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="fi fi-rr-calendar" />
        <span>{displayText}</span>
      </button>

      {open && (
        <>
          <div className="dp__backdrop" onClick={() => setOpen(false)} />
          <div className="dp__panel">
            <div className="dp__header">
              <button type="button" onClick={prevMonth} className="dp__nav"><i className="fi fi-rr-angle-left" /></button>
              <span className="dp__month-label">{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth} className="dp__nav"><i className="fi fi-rr-angle-right" /></button>
            </div>
            <div className="dp__weekdays">
              {DAYS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="dp__grid">
              {Array.from({ length: offset }, (_, i) => (
                <span key={`p${i}`} className="dp__day dp__day--other">{prevDays - offset + 1 + i}</span>
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1
                const iso = toISO(viewYear, viewMonth, day)
                const isToday = iso === todayISO
                const isSelected = value === iso
                return (
                  <button
                    key={day}
                    type="button"
                    className={
                      'dp__day' +
                      (isToday ? ' dp__day--today' : '') +
                      (isSelected ? ' dp__day--selected' : '')
                    }
                    onClick={() => handleSelect(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <div className="dp__footer">
              <button type="button" className="dp__footer-btn" onClick={() => { onChange(''); setOpen(false) }}>Borrar</button>
              <button type="button" className="dp__footer-btn dp__footer-btn--accent" onClick={() => handleSelect(today.getDate())}>Hoy</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
