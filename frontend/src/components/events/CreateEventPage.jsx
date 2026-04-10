import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '../../services/eventService'
import { getBuildings } from '../../services/mapService'
import { useAuth } from '../../hooks/useAuth'
import './CreateEventPage.css'

const TYPES = ['charla', 'taller', 'asamblea', 'competencia', 'feria']

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const buildings = getBuildings()

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    type: 'charla',
    buildingId: buildings[0]?.id || '',
    roomId: buildings[0]?.rooms[0]?.id || '',
    organizer: '',
    capacity: 30,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedBuilding = buildings.find((b) => b.id === form.buildingId)
  const rooms = selectedBuilding?.rooms || []

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title || !form.date || !form.time || !form.organizer) {
      setError('Completa los campos obligatorios.')
      return
    }
    setSubmitting(true)
    const room = rooms.find((r) => r.id === form.roomId)
    const payload = {
      ...form,
      buildingName: selectedBuilding?.name,
      roomName: room?.name,
      capacity: Number(form.capacity),
      createdBy: user?.email,
    }
    try {
      const result = await createEvent(payload)
      if (result.success) navigate(`/evento/${result.id}`)
      else setError('No se pudo crear el evento.')
    } catch {
      setError('Error al crear el evento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="create-event" onSubmit={handleSubmit}>
      <h2>Crear nuevo evento</h2>

      <label className="field">
        <span>Título *</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Ej: Charla de IA"
        />
      </label>

      <label className="field">
        <span>Descripción</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Breve descripción del evento"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Fecha *</span>
          <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </label>
        <label className="field">
          <span>Hora inicio *</span>
          <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
        </label>
        <label className="field">
          <span>Hora fin</span>
          <input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>Tipo</span>
        <select value={form.type} onChange={(e) => update('type', e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Edificio</span>
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
        <label className="field">
          <span>Aula</span>
          <select value={form.roomId} onChange={(e) => update('roomId', e.target.value)}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Organizador *</span>
          <input
            type="text"
            value={form.organizer}
            onChange={(e) => update('organizer', e.target.value)}
            placeholder="Nombre del organizador"
          />
        </label>
        <label className="field">
          <span>Capacidad</span>
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => update('capacity', e.target.value)}
          />
        </label>
      </div>

      {error && <p className="create-event__error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Creando...' : 'Crear evento'}
      </button>
    </form>
  )
}
