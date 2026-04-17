// Event Service — rutas a través del API Gateway (Persona 2)

const API_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL
const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = `${API_GATEWAY}/events`

const headers = {
  'Content-Type': 'application/json',
  'Ocp-Apim-Subscription-Key': API_KEY,
}

const JOINED_KEY = 'ubicatec:joined-events'
const DRAFT_KEY = 'ubicatec:event-draft'

// ── TEMPORAL (Fase I): persistencia local para CRUD ──
// El mock de Azure API Management no guarda datos reales.
// Usamos localStorage para simular persistencia en el browser.
// Eliminar todo este bloque cuando se conecte el backend real en Fase II.
const LOCAL_EVENTS_KEY = 'ubicatec:local-events'

function getLocalEvents() {
  try { return JSON.parse(localStorage.getItem(LOCAL_EVENTS_KEY)) || [] }
  catch { return [] }
}

function saveLocalEvents(events) {
  localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(events))
}

function getDeletedIds() {
  try { return JSON.parse(localStorage.getItem('ubicatec:deleted-events')) || [] }
  catch { return [] }
}

function saveDeletedIds(ids) {
  localStorage.setItem('ubicatec:deleted-events', JSON.stringify(ids))
}
// ── FIN bloque temporal ──

// ── API calls (Azure API Management + localStorage temporal) ──

export async function getEvents() {
  let remote = []
  try {
    const url = `${BASE_URL}/`
    const response = await fetch(url, { headers })
    const remoteData = await response.json()
    remote = Array.isArray(remoteData) ? remoteData : []
  } catch { /* API no disponible (ej. localhost sin red) */ }

  // TEMPORAL (Fase I): combinar mock + eventos locales, filtrar eliminados
  const local = getLocalEvents()
  const deletedIds = getDeletedIds()
  const all = [...remote, ...local].filter((ev) => !deletedIds.includes(ev.id))

  // Apply persisted available decrements from joinEvent
  const overrides = getAvailOverrides()
  return all.map((ev) => {
    const dec = overrides[ev.id]
    if (dec && ev.available != null && ev.capacity !== 0) {
      return { ...ev, available: Math.max(0, ev.available - dec) }
    }
    return ev
  })
}

export async function getEventById(id) {
  // TEMPORAL (Fase I): el endpoint GET /events/:id del mock siempre
  // devuelve el mismo evento. Usamos getEvents() y filtramos por id.
  const all = await getEvents()
  return all.find((ev) => ev.id === Number(id)) || null
}

export async function createEvent(eventData) {
  // Llamar al mock para mantener la integración
  await fetch(`${BASE_URL}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(eventData),
  }).catch(() => {})

  // TEMPORAL (Fase I): guardar en localStorage
  const local = getLocalEvents()
  const allEvents = [...local]
  const maxId = allEvents.reduce((max, ev) => Math.max(max, ev.id || 0), 100)
  const newEvent = { ...eventData, id: maxId + 1 }
  local.push(newEvent)
  saveLocalEvents(local)
  return { success: true, message: 'Evento creado exitosamente', id: newEvent.id }
}

export async function updateEvent(id, eventData) {
  // Llamar al mock para mantener la integración
  await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(eventData),
  }).catch(() => {})

  // TEMPORAL (Fase I): actualizar en localStorage
  const local = getLocalEvents()
  const idx = local.findIndex((ev) => ev.id === Number(id))
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...eventData }
    saveLocalEvents(local)
  }
  return { success: true, message: 'Evento actualizado exitosamente' }
}

export async function deleteEvent(id) {
  // Llamar al mock para mantener la integración
  await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers,
  }).catch(() => {})

  // TEMPORAL (Fase I): eliminar de localStorage o marcar como eliminado
  const local = getLocalEvents()
  const idx = local.findIndex((ev) => ev.id === Number(id))
  if (idx !== -1) {
    local.splice(idx, 1)
    saveLocalEvents(local)
  } else {
    // Es un evento del mock remoto, lo marcamos como eliminado
    const deleted = getDeletedIds()
    deleted.push(Number(id))
    saveDeletedIds(deleted)
  }
  return { success: true, message: 'Evento eliminado exitosamente' }
}

// ── Client-side filtering & pagination ──

export function filterEvents(events, { date, type, roomId }) {
  return events.filter((event) => {
    if (date && event.date !== date) return false
    if (type && event.type !== type) return false
    if (roomId && event.roomId !== roomId) return false
    return true
  })
}

export function paginateEvents(events, page, pageSize = 10) {
  const start = (page - 1) * pageSize
  return {
    data: events.slice(start, start + pageSize),
    total: events.length,
    totalPages: Math.max(1, Math.ceil(events.length / pageSize)),
    currentPage: page,
  }
}

// ── Draft persistence (local) ──

let DRAFT_EVENT = (() => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) }
  catch { return null }
})()

export async function saveDraft(formData) {
  DRAFT_EVENT = { ...formData, savedAt: Date.now() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(DRAFT_EVENT))
  return { success: true }
}

export async function loadDraft() {
  return DRAFT_EVENT
}

export async function clearDraft() {
  DRAFT_EVENT = null
  localStorage.removeItem(DRAFT_KEY)
}

// ── Event join persistence (local) ──

const AVAIL_KEY = 'ubicatec:available-overrides'

function getAvailOverrides() {
  try { return JSON.parse(localStorage.getItem(AVAIL_KEY)) || {} }
  catch { return {} }
}

export function joinEvent(eventId) {
  const joined = getJoinedEvents()
  if (!joined.includes(eventId)) {
    joined.push(eventId)
    localStorage.setItem(JOINED_KEY, JSON.stringify(joined))

    // Persist the available decrement so it survives page reload
    const overrides = getAvailOverrides()
    overrides[eventId] = (overrides[eventId] || 0) + 1
    localStorage.setItem(AVAIL_KEY, JSON.stringify(overrides))
  }
}

export function getJoinedEvents() {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY)) || [] }
  catch { return [] }
}

export function hasJoinedEvent(eventId) {
  return getJoinedEvents().includes(Number(eventId))
}
