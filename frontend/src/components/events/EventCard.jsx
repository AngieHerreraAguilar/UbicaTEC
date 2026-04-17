import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconCalendar, IconClock, IconLocation } from '../shared/Icons'
import { getCurrentUser } from '../../services/authService'
import './EventCard.css'

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const SWIPE_THRESHOLD = 72
const DELETE_ZONE_W = 80

function formatShortDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

function PriceDisplay({ price }) {
  if (!price || price === 'FREE' || price === 'free' || price === 0) {
    return <p className="event-card__price">FREE</p>
  }
  const num = String(price).replace(/\s/g, '')
  return (
    <p className="event-card__price event-card__price--money">
      <span className="event-card__currency">$</span>
      <span className="event-card__amount">{Number(num).toLocaleString('es-CR')} </span>
      <span className="event-card__pp">p.p</span>
    </p>
  )
}

export default function EventCard({ event, onDelete }) {
  const user = getCurrentUser()
  const canDelete = user && event.createdBy && event.createdBy === user.email

  const [offsetX, setOffsetX] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, moving: false, isMouse: false, didDrag: false })

  // ── Shared drag logic ──
  const onDragStart = (x, y, isMouse) => {
    if (!canDelete) return
    dragRef.current = { startX: x, startY: y, moving: false, isMouse, didDrag: false }
  }

  const onDragMove = (x, y) => {
    if (!canDelete) return
    const dx = x - dragRef.current.startX
    const dy = y - dragRef.current.startY

    if (!dragRef.current.moving && Math.abs(dy) > Math.abs(dx)) return
    dragRef.current.moving = true
    dragRef.current.didDrag = true

    const clamped = Math.max(-DELETE_ZONE_W, Math.min(0, dx + (swiped ? -DELETE_ZONE_W : 0)))
    setOffsetX(clamped)
  }

  const onDragEnd = () => {
    if (!canDelete || !dragRef.current.moving) return
    dragRef.current.moving = false
    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      setOffsetX(-DELETE_ZONE_W)
      setSwiped(true)
    } else {
      setOffsetX(0)
      setSwiped(false)
    }
  }

  // ── Touch handlers (mobile) ──
  const handleTouchStart = (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY, false)
  const handleTouchMove = (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)
  const handleTouchEnd = () => onDragEnd()

  // ── Mouse handlers (desktop) ──
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    onDragStart(e.clientX, e.clientY, true)
    e.preventDefault()
  }
  const handleMouseMove = (e) => {
    if (!dragRef.current.isMouse) return
    onDragMove(e.clientX, e.clientY)
  }
  const handleMouseUp = () => {
    if (!dragRef.current.isMouse) return
    dragRef.current.isMouse = false
    onDragEnd()
  }
  const handleMouseLeave = () => {
    if (!dragRef.current.isMouse) return
    dragRef.current.isMouse = false
    onDragEnd()
  }

  const handleDeleteTap = () => setConfirming(true)

  const handleConfirm = () => {
    onDelete?.(event.id)
    setConfirming(false)
    setSwiped(false)
    setOffsetX(0)
  }

  const handleCancel = () => {
    setConfirming(false)
    setSwiped(false)
    setOffsetX(0)
  }

  const availabilityText =
    event.availabilityLabel ||
    (event.available != null ? `${event.available} cupos disponibles` : 'Disponible')

  return (
    <div className="event-card-swipe">
      {/* Delete zone behind the card — only rendered during swipe */}
      {canDelete && (offsetX < 0 || swiped) && (
        <button
          type="button"
          className="event-card-swipe__delete"
          onClick={handleDeleteTap}
          aria-label="Eliminar evento"
        >
          <i className="fi fi-rr-trash" />
        </button>
      )}

      {/* Card foreground */}
      <Link
        to={`/evento/${event.id}`}
        className="event-card"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragRef.current.moving ? 'none' : 'transform 0.28s ease',
        }}
        onClick={(e) => { if (swiped || dragRef.current.didDrag) e.preventDefault() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="event-card__body">
          <h3 className="event-card__title">{event.title}</h3>
          <div className="event-card__meta">
            <div className="event-card__meta-row">
              <div className="event-card__meta-item">
                <IconCalendar className="event-card__meta-icon" />
                <span>{formatShortDate(event.date)}</span>
              </div>
              <div className="event-card__meta-item">
                <IconClock className="event-card__meta-icon" />
                <span>{event.startHour}</span>
              </div>
            </div>
            <div className="event-card__meta-item">
              <IconLocation className="event-card__meta-icon" />
              <span>{event.buildingName}</span>
            </div>
          </div>
        </div>
        <div className="event-card__aside">
          <PriceDisplay price={event.price} />
          <div className="event-card__availability">{availabilityText}</div>
        </div>
      </Link>

      {/* Confirmation overlay */}
      {confirming && (
        <div className="event-card-swipe__confirm">
          <p className="event-card-swipe__confirm-text">¿Eliminar este evento?</p>
          <div className="event-card-swipe__confirm-actions">
            <button type="button" className="event-card-swipe__btn--cancel" onClick={handleCancel}>
              Cancelar
            </button>
            <button type="button" className="event-card-swipe__btn--delete" onClick={handleConfirm}>
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
