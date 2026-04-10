import './DestinationCard.css'

export default function DestinationCard({ room, building, onNavigate, exiting, hasUserLocation }) {
  if (!room || !building) return null

  const fromLabel = hasUserLocation ? 'Tu ubicación' : 'Edificio Administrativo'

  return (
    <div className={'destination-card-wrap' + (exiting ? ' is-exiting' : '')}>
      <aside className="destination-card" role="dialog" aria-label={`Destino sugerido: ${room.name}`}>
        <header className="destination-card__head">
          <div className="destination-card__head-text">
            <span className="destination-card__eyebrow">DESTINO SUGERIDO</span>
            <h2 className="destination-card__title">{room.name}</h2>
            {room.id !== building.id && (
              <span className="destination-card__building">
                <i className="fi fi-rr-building" aria-hidden="true" />
                {building.name}
              </span>
            )}
          </div>
          <span className="destination-card__floor-pill">{room.floor}º piso</span>
        </header>

        <div className="destination-card__from">
          <i className="fi fi-sr-walking" />
          <span>Desde: <strong>{fromLabel}</strong></span>
        </div>

        <button
          type="button"
          className="destination-card__cta"
          onClick={() => onNavigate && onNavigate(room, building)}
        >
          <i className="fi fi-sr-paper-plane" />
          <span>EXPLORAR RUTA</span>
        </button>

        {!hasUserLocation && (
          <p className="destination-card__hint">
            Doble tap en el mapa para marcar tu ubicación
          </p>
        )}
      </aside>
    </div>
  )
}
