import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getEvents, deleteEvent } from '../../services/eventService'
import { useAuth } from '../../hooks/useAuth'
import { logout } from '../../services/authService'
import FeaturedCarousel from './FeaturedCarousel'
import EventCard from './EventCard'
import './EventsPage.css'

const SLIDE_MS = 320

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Search state
  const [searching, setSearching] = useState(false)
  const [iconIsClose, setIconIsClose] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const swapTimer = useRef(null)

  // Refetch events every time we navigate to this page (e.g. after creating one)
  useEffect(() => {
    getEvents().then((data) => {
      setEvents(data)
      setLoading(false)
    })
  }, [location.key])

  useEffect(() => () => clearTimeout(swapTimer.current), [])

  const handleCreate = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/crear-evento&action=create')
    } else {
      navigate('/crear-evento')
    }
  }

  const handleOpenSearch = () => {
    inputRef.current?.focus({ preventScroll: true })
    setSearching(true)
    clearTimeout(swapTimer.current)
    swapTimer.current = setTimeout(() => setIconIsClose(true), SLIDE_MS)
  }

  const handleCloseSearch = () => {
    setIconIsClose(false)
    clearTimeout(swapTimer.current)
    swapTimer.current = setTimeout(() => {
      setSearching(false)
      setQuery('')
      inputRef.current?.blur()
    }, 20)
  }

  const handleDelete = async (id) => {
    await deleteEvent(id)
    setEvents((prev) => prev.filter((ev) => ev.id !== id))
  }

  const featuredEvents = events.filter((ev) => ev.featured)
  const regulars = events.filter((ev) => !ev.featured)

  // Normalize: strip accents + lowercase for fuzzy matching
  const norm = (s) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const matchesQuery = (event) => {
    const n = norm(query)
    if (!n) return true
    return (
      norm(event.title).includes(n) ||
      norm(event.organizer).includes(n) ||
      norm(event.buildingName).includes(n) ||
      norm(event.type).includes(n) ||
      norm(event.description).includes(n)
    )
  }

  const filteredFeatured = featuredEvents.filter(matchesQuery)
  const filteredRegulars = regulars.filter(matchesQuery)

  return (
    <div className="events-page">
      <div className={'events-page__toolbar' + (searching ? ' is-searching' : '')}>
        <div className="events-page__toolbar-left">
          <button
            type="button"
            className="events-page__icon-btn events-page__add-btn"
            onClick={handleCreate}
            aria-label="Crear evento"
          >
            <i className="fi fi-sr-plus" />
          </button>
          {isAuthenticated && (
            <button
              type="button"
              className="events-page__icon-btn events-page__add-btn"
              onClick={logout}
              aria-label="Cerrar sesión"
            >
              <i className="fi fi-rr-sign-out-alt" />
            </button>
          )}
        </div>

        {/* Search pill: expands when active */}
        <div className="events-page__search-pill">
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="events-page__search-input"
            placeholder="Buscar eventos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="events-page__search-btn"
            aria-label={searching ? 'Cerrar búsqueda' : 'Buscar'}
            onClick={searching ? handleCloseSearch : handleOpenSearch}
          >
            <i className={iconIsClose ? 'fi fi-rr-cross-small' : 'fi fi-rr-search'} />
          </button>
        </div>
      </div>

      <div className="events-page__list">
        {loading ? (
          <p className="events-page__state">Cargando eventos...</p>
        ) : (filteredFeatured.length > 0 || filteredRegulars.length > 0) ? (
          <>
            {filteredFeatured.length > 0 && (
              <div className="events-page__featured-wrap">
                <FeaturedCarousel events={filteredFeatured} />
              </div>
            )}
            {filteredRegulars.map((ev) => (
              <EventCard key={ev.id} event={ev} onDelete={handleDelete} />
            ))}
          </>
        ) : (
          <p className="events-page__state">No se encontraron eventos para "{query}"</p>
        )}
      </div>
    </div>
  )
}
