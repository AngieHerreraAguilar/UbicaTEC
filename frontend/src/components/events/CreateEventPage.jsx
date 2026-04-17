import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent, saveDraft, loadDraft, clearDraft } from '../../services/eventService'
import { getBuildings, getCampus, getRoomById } from '../../services/mapService'
import { useAuth } from '../../hooks/useAuth'
import campusMapSvg from '../../assets/campus-map.svg'
import DatePicker from './DatePicker'
import TimePicker from './TimePicker'
import './CreateEventPage.css'

function MiniMapPreview({ roomId, onExplore }) {
  const campus = getCampus()
  const [imgW, imgH] = campus.imageSize
  const roomData = getRoomById(roomId)

  // The preview container is 350×224. The SVG is rendered with width = containerW * scale.
  // We position the image so the room center lands at the center of the container.
  const containerW = 350
  const containerH = 224
  const scale = 3
  const renderedW = containerW * scale
  const renderedH = renderedW * (imgH / imgW)

  let imgLeft = -(renderedW - containerW) / 2
  let imgTop = -(renderedH - containerH) / 2
  if (roomData?.bounds) {
    const [[x1, y1], [x2, y2]] = roomData.bounds
    const cx = (x1 + x2) / 2
    const cy = (y1 + y2) / 2
    imgLeft = containerW / 2 - (cx / imgW) * renderedW
    imgTop = containerH / 2 - (cy / imgH) * renderedH
  }

  return (
    <div className="ce-field__map-preview">
      <img
        src={campusMapSvg}
        alt=""
        className="ce-field__map-img"
        draggable={false}
        style={{
          width: `${renderedW}px`,
          height: `${renderedH}px`,
          left: `${imgLeft}px`,
          top: `${imgTop}px`,
        }}
      />
      <div className="ce-field__map-overlay" />
      <div className="ce-field__map-pin"><i className="fi fi-sr-marker" /></div>
      <button type="button" className="ce-field__map-btn" onClick={onExplore}>
        <i className="fi fi-rr-map" />
        <span>Explorar mapa</span>
      </button>
    </div>
  )
}

const CATEGORIES = [
  { value: 'conferencia', label: 'Conferencia' },
  { value: 'charla', label: 'Charla' },
  { value: 'taller', label: 'Taller' },
  { value: 'asamblea', label: 'Asamblea' },
  { value: 'competencia', label: 'Competencia' },
  { value: 'feria', label: 'Feria' },
]

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const buildings = getBuildings()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    type: 'conferencia',
    capacity: '',
    price: '',
    description: '',
    date: '',
    time: '',
    buildingId: buildings[0]?.id || '',
    roomId: buildings[0]?.rooms[0]?.id || '',
    secure: false,
    featured: false,
  })
  const [_bannerFile, setBannerFile] = useState(null) // eslint-disable-line no-unused-vars
  const [bannerPreview, setBannerPreview] = useState(null)
  const [catOpen, setCatOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Load draft on mount
  useEffect(() => {
    loadDraft().then((draft) => {
      if (draft) setForm((f) => ({ ...f, ...draft }))
    })
  }, [])

  const selectedBuilding = buildings.find((b) => b.id === form.buildingId)
  const rooms = selectedBuilding?.rooms || []

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    // Clear error on change
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  // ── Validation ──
  const validateField = (key) => {
    const v = form[key]
    let err = null
    switch (key) {
      case 'title':
        if (!v.trim()) err = 'El nombre del evento es obligatorio'
        break
      case 'description':
        if (!v.trim()) err = 'Agrega una descripción'
        break
      case 'date':
        if (!v) err = 'Selecciona una fecha'
        break
      case 'time':
        if (!v) err = 'Selecciona una hora'
        break
      default:
        break
    }
    setErrors((e) => ({ ...e, [key]: err }))
    return !err
  }

  const validateAll = () => {
    const keys = ['title', 'description', 'date', 'time']
    let firstError = null
    for (const k of keys) {
      if (!validateField(k) && !firstError) firstError = k
    }
    if (firstError) {
      const el = document.querySelector(`[data-field="${firstError}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return !firstError
  }

  // ── Banner upload ──
  const handleBannerChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, banner: 'Máximo 5MB' }))
      return
    }
    setBannerFile(file)
    setErrors((prev) => ({ ...prev, banner: null }))
    const reader = new FileReader()
    reader.onload = (ev) => setBannerPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, banner: 'Máximo 5MB' }))
        return
      }
      setBannerFile(file)
      setErrors((prev) => ({ ...prev, banner: null }))
      const reader = new FileReader()
      reader.onload = (ev) => setBannerPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }, [])

  // ── Submit ──
  const handlePublish = () => {
    if (!validateAll()) return
    setShowConfirm(true)
  }

  const confirmPublish = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    const room = rooms.find((r) => r.id === form.roomId)
    const payload = {
      title: form.title,
      description: form.description,
      date: form.date,
      startHour: form.time,
      endHour: '',
      type: form.type,
      buildingId: form.buildingId,
      buildingName: selectedBuilding?.name,
      roomId: form.roomId,
      roomName: room?.name,
      organizer: user?.email || 'Organizador',
      capacity: form.capacity ? Number(form.capacity) : 0,
      available: form.capacity ? Number(form.capacity) : 0,
      price: form.price ? form.price : 'FREE',
      featured: form.featured,
      secure: form.secure,
      availabilityLabel: form.capacity ? `${form.capacity} cupos disponibles` : 'Asistencia abierta',
      createdBy: user?.email,
    }
    try {
      const result = await createEvent(payload)
      if (result.success) {
        await clearDraft()
        setShowSuccess(true)
        setTimeout(() => navigate('/eventos'), 1800)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRoom = rooms.find((r) => r.id === form.roomId)
  const locationLabel = selectedRoom
    ? `${selectedRoom.name} | ${selectedBuilding?.name}`
    : 'Seleccionar lugar'

  return (
    <div className="create-event">
      {/* Top bar */}
      <div className="create-event__topbar">
        <button type="button" className="create-event__back" onClick={() => navigate(-1)} aria-label="Volver">
          <i className="fi fi-rr-arrow-small-left" />
        </button>
        <span className="create-event__topbar-title">Crear Evento</span>
      </div>

      {/* ═══ Section: Detalles del Evento ═══ */}
      <section className="create-event__section">
        <h2 className="create-event__heading">Detalles del Evento</h2>
        <p className="create-event__sub">Proporciona la información principal para los asistentes.</p>

        {/* Nombre */}
        <label className="ce-field" data-field="title">
          <span className="ce-field__label">NOMBRE DEL EVENTO <span className="ce-req">*</span></span>
          <div className={'ce-field__input-wrap' + (errors.title ? ' has-error' : '')}>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              onBlur={() => validateField('title')}
              placeholder="Ej. Innovación en IA: El Futuro del Trabajo"
            />
          </div>
          {errors.title && <span className="ce-field__error">{errors.title}</span>}
        </label>

        {/* Categoría - custom dropdown */}
        <div className="ce-field">
          <span className="ce-field__label">CATEGORÍA</span>
          <button
            type="button"
            className="ce-field__select"
            onClick={() => setCatOpen((o) => !o)}
          >
            <span>{CATEGORIES.find((c) => c.value === form.type)?.label}</span>
            <i className={'fi fi-rr-angle-small-down ce-field__chevron' + (catOpen ? ' is-open' : '')} />
          </button>
          {catOpen && (
            <ul className="ce-field__dropdown">
              {CATEGORIES.map((c) => (
                <li key={c.value}>
                  <button
                    type="button"
                    className={'ce-field__dropdown-item' + (c.value === form.type ? ' is-selected' : '')}
                    onClick={() => { update('type', c.value); setCatOpen(false) }}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Capacidad */}
        <label className="ce-field">
          <span className="ce-field__label">CAPACIDAD/LÍMITE DE CUPOS</span>
          <div className="ce-field__input-wrap ce-field__input-wrap--icon">
            <i className="fi fi-rr-users" />
            <input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) => update('capacity', e.target.value)}
              placeholder="Sin límite (asistencia abierta)"
            />
          </div>
        </label>

        {/* Precio */}
        <label className="ce-field">
          <span className="ce-field__label">PRECIO DE ENTRADA</span>
          <div className="ce-field__input-wrap ce-field__input-wrap--icon">
            <span className="ce-field__currency-symbol">₡</span>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              placeholder="Gratis (sin costo)"
            />
          </div>
          <span className="ce-field__helper">Deja vacío si el evento es gratuito</span>
        </label>

        {/* Descripción */}
        <label className="ce-field" data-field="description">
          <span className="ce-field__label">DESCRIPCIÓN <span className="ce-req">*</span></span>
          <div className={'ce-field__textarea-wrap' + (errors.description ? ' has-error' : '')}>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              onBlur={() => validateField('description')}
              placeholder="Describe los objetivos, ponentes y qué esperar del evento..."
            />
          </div>
          {errors.description && <span className="ce-field__error">{errors.description}</span>}
        </label>
      </section>

      {/* ═══ Section: Ubicación y Tiempo ═══ */}
      <section className="create-event__section create-event__section--border">
        <h2 className="create-event__heading">Ubicación y Tiempo</h2>
        <p className="create-event__sub">Define cuándo y dónde ocurrirá el encuentro.</p>

        {/* Fecha */}
        <div className="ce-field" data-field="date">
          <span className="ce-field__label">FECHA <span className="ce-req">*</span></span>
          <DatePicker
            value={form.date}
            onChange={(v) => update('date', v)}
            error={errors.date}
          />
          {errors.date && <span className="ce-field__error">{errors.date}</span>}
        </div>

        {/* Hora */}
        <div className="ce-field" data-field="time">
          <span className="ce-field__label">HORA <span className="ce-req">*</span></span>
          <TimePicker
            value={form.time}
            onChange={(v) => update('time', v)}
            error={errors.time}
          />
          {errors.time && <span className="ce-field__error">{errors.time}</span>}
        </div>

        {/* Lugar */}
        <div className="ce-field">
          <span className="ce-field__label">LUGAR DEL EVENTO</span>
          <button
            type="button"
            className={'ce-field__select ce-field__select--location' + (locOpen ? ' is-open' : '')}
            onClick={() => setLocOpen((o) => !o)}
          >
            <i className="fi fi-rr-marker" />
            <span>{locationLabel}</span>
            <i className={'fi fi-rr-angle-small-down ce-field__chevron' + (locOpen ? ' is-open' : '')} />
          </button>
          {/* Expandable building/room selectors */}
          {locOpen && (
            <div className="ce-field__location-panel">
              <label className="ce-field__location-row">
                <span className="ce-field__location-label">Edificio</span>
                <select
                  value={form.buildingId}
                  onChange={(e) => {
                    const bId = e.target.value
                    const firstRoom = buildings.find((b) => b.id === bId)?.rooms[0]?.id || ''
                    setForm((f) => ({ ...f, buildingId: bId, roomId: firstRoom }))
                  }}
                >
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <label className="ce-field__location-row">
                <span className="ce-field__location-label">Aula / Espacio</span>
                <select value={form.roomId} onChange={(e) => update('roomId', e.target.value)}>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            </div>
          )}
          {/* Mini map preview — centers on selected room */}
          <MiniMapPreview
            roomId={form.roomId}
            onExplore={() => {
              saveDraft(form)
              navigate(`/mapa?from=crear-evento&select=${form.roomId}`)
            }}
          />
        </div>
      </section>

      {/* ═══ Section: Banner Upload ═══ */}
      <section className="create-event__section">
        <h3 className="create-event__heading create-event__heading--sm">Banner del evento</h3>
        <p className="create-event__sub">Formatos recomendados: JPG, PNG. Máx 5MB.</p>

        <div
          className={'ce-upload' + (bannerPreview ? ' has-preview' : '')}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner preview" className="ce-upload__preview" />
          ) : (
            <div className="ce-upload__placeholder">
              <div className="ce-upload__icon-circle">
                <i className="fi fi-rr-cloud-upload-alt" />
              </div>
              <span className="ce-upload__text">Subir Imagen</span>
              <span className="ce-upload__hint">ARRASTRA O HAZ CLIC AQUÍ</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="ce-upload__input"
            onChange={handleBannerChange}
          />
        </div>
        {errors.banner && <span className="ce-field__error">{errors.banner}</span>}
      </section>

      {/* ═══ Section: Metadata Bento (Seguridad + Destacado) ═══ */}
      <section className="create-event__section">
        <div className="ce-bento">
          <button
            type="button"
            className={'ce-bento__card ce-bento__card--security' + (form.secure ? ' is-active' : '')}
            onClick={() => update('secure', !form.secure)}
          >
            <i className="fi fi-sr-shield-check" />
            <strong>Seguridad</strong>
            <p>Requiere validación de ID institucional para el registro.</p>
          </button>
          <button
            type="button"
            className={'ce-bento__card ce-bento__card--featured' + (form.featured ? ' is-active' : '')}
            onClick={() => update('featured', !form.featured)}
          >
            <i className="fi fi-sr-star" />
            <strong>Destacado</strong>
            <p>Aparecerá en el carrusel principal de la app durante 3 días.</p>
          </button>
        </div>
      </section>

      {/* ═══ Action Buttons ═══ */}
      <section className="create-event__actions">
        <button
          type="button"
          className="ce-btn-publish"
          onClick={handlePublish}
          disabled={submitting}
        >
          {submitting ? 'Publicando...' : 'Publicar Evento'}
        </button>
        <button
          type="button"
          className="ce-btn-draft"
          onClick={async () => {
            await saveDraft(form)
            navigate('/eventos')
          }}
        >
          Guardar Borrador
        </button>
      </section>

      {/* ═══ Confirm Modal ═══ */}
      {showConfirm && (
        <div className="ce-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="ce-modal" onClick={(e) => e.stopPropagation()}>
            <h3>¿Publicar evento?</h3>
            <p>Una vez publicado, el evento será visible para todos los estudiantes.</p>
            <div className="ce-modal__actions">
              <button type="button" className="ce-modal__cancel" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button type="button" className="ce-modal__confirm" onClick={confirmPublish}>Publicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Success Screen ═══ */}
      {showSuccess && (
        <div className="ce-success-overlay">
          <div className="ce-success">
            <div className="ce-success__check"><i className="fi fi-sr-check" /></div>
            <h2>¡Evento creado!</h2>
            <p>Redirigiendo al detalle...</p>
          </div>
        </div>
      )}
    </div>
  )
}
