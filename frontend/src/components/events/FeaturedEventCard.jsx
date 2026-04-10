import { Link } from 'react-router-dom'
import './FeaturedEventCard.css'

export default function FeaturedEventCard({ event }) {
  const total = event.capacity || 0
  const available = event.available ?? 0
  const taken = Math.max(0, total - available)
  const progress = total > 0 ? Math.min(100, (taken / total) * 100) : 0

  return (
    <Link to={`/evento/${event.id}`} className="featured-card">
      <div className="featured-card__blur" aria-hidden="true" />
      <div className="featured-card__head">
        <div className="featured-card__icon">
          <i className="fi fi-sr-rocket-lunch" />
        </div>
        <h3 className="featured-card__title">{event.title}</h3>
      </div>
      <p className="featured-card__desc">{event.description}</p>
      <div className="featured-card__availability">
        <i className="fi fi-sr-users-alt" />
        <span>{available} Cupos libres</span>
      </div>
      <div className="featured-card__progress">
        <div className="featured-card__progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  )
}
