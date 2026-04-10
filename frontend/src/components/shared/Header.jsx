import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import './Header.css'

const SLIDE_MS = 320
const RECENTS_KEY = 'ubicatec:search-recents'
const MAX_RECENTS = 6

function loadRecents() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENTS_KEY)) || []
    // Filter out stale entries missing buildingId (saved before fix)
    return list.filter((r) => r.id && r.buildingId)
  } catch { return [] }
}
function saveRecent(item) {
  const list = loadRecents().filter((r) => r.id !== item.id)
  list.unshift({
    id: item.id,
    name: item.name,
    buildingName: item.buildingName,
    buildingId: item.buildingId,
    floor: item.floor,
    type: item.type,
    bounds: item.bounds,
  })
  localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)))
}

export default function Header({ searchResults, onSearch, onSelectResult }) {
  const location = useLocation()
  const [searching, setSearching] = useState(false)
  const [iconIsClose, setIconIsClose] = useState(false)
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState(loadRecents)
  const inputRef = useRef(null)
  const swapTimer = useRef(null)

  const titleMap = {
    '/mapa': 'UbicaTEC',
    '/eventos': 'Eventos',
    '/crear-evento': 'Crear evento',
  }
  const title =
    titleMap[location.pathname] ||
    (location.pathname.startsWith('/evento/') ? 'Detalle' : 'UbicaTEC')

  const isMap = location.pathname === '/mapa'
  const effectiveSearching = isMap && searching

  useEffect(() => () => clearTimeout(swapTimer.current), [])

  // Notify parent of query changes
  useEffect(() => {
    if (onSearch) onSearch(effectiveSearching ? query : '')
  }, [query, effectiveSearching, onSearch])

  const handleOpen = (e) => {
    if (!isMap) return
    e.preventDefault()
    const el = inputRef.current
    if (el) {
      el.removeAttribute('readonly')
      el.focus({ preventScroll: true })
    }
    setSearching(true)
    setRecents(loadRecents())
    clearTimeout(swapTimer.current)
    swapTimer.current = setTimeout(() => setIconIsClose(true), SLIDE_MS)
  }

  const handleClose = () => {
    setIconIsClose(false)
    clearTimeout(swapTimer.current)
    swapTimer.current = setTimeout(() => {
      setSearching(false)
      setQuery('')
      inputRef.current?.blur()
    }, 20)
  }

  const handleSelect = (item) => {
    saveRecent(item)
    setRecents(loadRecents())
    setQuery('')
    handleClose()
    if (onSelectResult) onSelectResult(item)
  }

  const handleRecentClick = (recent) => {
    // Fire selection BEFORE close, so MapPage receives the item
    // while the component is still mounted.
    if (onSelectResult) onSelectResult(recent)
    handleClose()
  }

  const handlePillClick = (e) => {
    if (!isMap || effectiveSearching) return
    if (
      e.target.closest('.app-header__search') ||
      e.target.closest('.app-header__input')
    ) return
    handleOpen(e)
  }

  const results = searchResults || []
  const showResults = effectiveSearching && query.length > 0 && results.length > 0
  const showRecents = effectiveSearching && query.length === 0 && recents.length > 0

  return (
    <header className="app-header" role="banner">
      <div
        className={'app-header__pill' + (effectiveSearching ? ' is-searching' : '')}
        onClick={handlePillClick}
        role={isMap && !effectiveSearching ? 'button' : undefined}
      >
        <span className="app-header__brand" aria-label="UbicaTEC">
          {title === 'UbicaTEC' ? (
            <>Ubica<span className="accent">TEC</span></>
          ) : (
            title
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="app-header__input"
          placeholder="Buscar aulas, edificios..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          type="button"
          className="app-header__search"
          aria-label={effectiveSearching ? 'Cerrar búsqueda' : 'Buscar'}
          onClick={effectiveSearching ? handleClose : handleOpen}
          disabled={!isMap}
        >
          <i className={iconIsClose ? 'fi fi-rr-cross-small' : 'fi fi-rr-search'} />
        </button>
      </div>

      {/* Dropdown: autocomplete results */}
      {showResults && (
        <ul className="app-header__dropdown">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="app-header__result" onClick={() => handleSelect(r)}>
                <i className="fi fi-rr-marker" />
                <div className="app-header__result-text">
                  <span className="app-header__result-name">{r.name}</span>
                  {r.buildingName && (
                    <span className="app-header__result-building">{r.buildingName}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Dropdown: recent searches as chips */}
      {showRecents && (
        <div className="app-header__recents">
          <span className="app-header__recents-label">Recientes</span>
          <div className="app-header__chips">
            {recents.map((r) => (
              <button
                key={r.id}
                type="button"
                className="app-header__chip"
                onClick={() => handleRecentClick(r)}
              >
                <i className="fi fi-rr-clock" />
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
