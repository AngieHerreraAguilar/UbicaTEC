import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getEventById } from '../../services/eventService'
import { useAuth } from '../../hooks/useAuth'
import './EventDetailPage.css'

function formatLongDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).replace(/^./, (c) => c.toUpperCase())
}

function formatTimeRange(start, end) {
  const fmt = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hh = h % 12 || 12
    return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
  }
  return `${fmt(start)} - ${fmt(end)}`
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    getEventById(id).then((data) => {
      setEvent(data)
      setLoading(false)
    })
  }, [id])

  const handleJoin = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/evento/${id}&action=join`)
      return
    }
    setJoined(true)
  }

  if (loading) return <div className="event-detail__state">Cargando...</div>
  if (!event) return <div className="event-detail__state">Evento no encontrado.</div>

  const paragraphs = (event.longDescription || event.description || '').split('\n\n')

  return (
    <div className="event-detail">
      {/* Top bar: back + title */}
      <div className="event-detail__topbar">
        <button
          type="button"
          className="event-detail__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <i className="fi fi-rr-arrow-small-left" />
        </button>
        <h1 className="event-detail__topbar-title">Detalles del evento</h1>
      </div>

      {/* Hero visual section */}
      <section className="event-detail__hero">
        <div className="event-detail__hero-gradient" />
        <div className="event-detail__hero-content">
          {event.badge && (
            <div className="event-detail__hero-badge">
              <span>{event.badge}</span>
            </div>
          )}
          <h2 className="event-detail__hero-title">{event.title}</h2>
        </div>
      </section>

      {/* Host card */}
      <section className="event-detail__host-card">
        {event.available != null && (
          <div className="event-detail__cupos-badge">
            {event.available} cupos disponibles
          </div>
        )}
        <div className="event-detail__host-row">
          <div className="event-detail__host-icon">
            <i className="fi fi-sr-graduation-cap" />
          </div>
          <div className="event-detail__host-text">
            <span className="event-detail__host-label">ORGANIZADO POR</span>
            <strong className="event-detail__host-name">{event.organizer}</strong>
          </div>
        </div>
      </section>

      {/* Description card */}
      <section className="event-detail__description-card">
        <h3 className="event-detail__section-title">Acerca de este evento</h3>
        {paragraphs.map((p, i) => (
          <p key={i} className="event-detail__paragraph">{p}</p>
        ))}
        <div className="event-detail__info-rows">
          <div className="event-detail__info-row">
            <i className="fi fi-rr-calendar" />
            <span>{formatLongDate(event.date)}</span>
          </div>
          <div className="event-detail__info-row">
            <i className="fi fi-rr-clock" />
            <span>{formatTimeRange(event.time, event.endTime)}</span>
          </div>
        </div>
      </section>

      {/* RSVP action card */}
      <section className="event-detail__rsvp-card">
        <h3 className="event-detail__rsvp-title">Confirmar Asistencia</h3>
        <p className="event-detail__rsvp-desc">
          Asegura tu espacio para participar de este exclusivo evento.
        </p>
        <button
          type="button"
          className="event-detail__rsvp-button"
          onClick={handleJoin}
          disabled={joined}
        >
          {joined ? '¡Estás inscrito!' : 'Unirse al evento'}
        </button>
        <p className="event-detail__rsvp-footer">
          13 ESTUDIANTES HAN CONFIRMADO ASISTENCIA
        </p>
      </section>

      {/* Location preview card */}
      <section className="event-detail__location-card">
        <div className="event-detail__location-map" aria-hidden="true">
          <div className="event-detail__location-pin">
            <i className="fi fi-sr-marker" />
          </div>
        </div>
        <h4 className="event-detail__location-title">
          {event.buildingName}, Planta 1
        </h4>
        <p className="event-detail__location-sub">
          {(event.roomName || '').toUpperCase()}
        </p>
        <button
          type="button"
          className="event-detail__location-button"
          onClick={() => navigate('/mapa')}
        >
          <i className="fi fi-rr-map" />
          Ver Ubicación
        </button>
      </section>
    </div>
  )
}
