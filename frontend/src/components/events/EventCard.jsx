import { Link } from 'react-router-dom'
import './EventCard.css'

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatShortDate(iso) {
  const d = new Date(iso + 'T00:00:00')
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`
}

function PriceDisplay({ price }) {
  if (!price || price === 'FREE' || price === 'free' || price === 0) {
    return <p className="event-card__price">FREE</p>
  }
  // Numeric / colones price
  const num = String(price).replace(/\s/g, '')
  return (
    <p className="event-card__price event-card__price--money">
      <span className="event-card__currency">$</span>
      <span className="event-card__amount">{Number(num).toLocaleString('es-CR')} </span>
      <span className="event-card__pp">p.p</span>
    </p>
  )
}

export default function EventCard({ event }) {
  const availabilityText =
    event.availabilityLabel ||
    (event.available != null ? `${event.available} cupos disponibles` : 'Disponible')

  return (
    <Link to={`/evento/${event.id}`} className="event-card">
      <div className="event-card__body">
        <h3 className="event-card__title">{event.title}</h3>
        <div className="event-card__meta">
          <div className="event-card__meta-row">
            <div className="event-card__meta-item">
              <i className="fi fi-sr-calendar" />
              <span>{formatShortDate(event.date)}</span>
            </div>
            <div className="event-card__meta-item">
              <i className="fi fi-rr-alarm-clock" />
              <span>{event.time}</span>
            </div>
          </div>
          <div className="event-card__meta-item">
            <i className="fi fi-sr-marker" />
            <span>{event.buildingName}</span>
          </div>
        </div>
      </div>
      <div className="event-card__aside">
        <PriceDisplay price={event.price} />
        <div className="event-card__availability">{availabilityText}</div>
      </div>
    </Link>
  )
}
