// Event Service — STUB temporal
// Será REEMPLAZADO por el archivo real de Persona 3 (Azure API Management mocks).
// TODO(integración): reemplazar por eventService.js real.

let SEED_EVENTS = [
  {
    id: 1,
    title: 'Club de Robótica',
    description: 'Sesión semanal de integración para nuevos miembros.',
    longDescription:
      'Explora las últimas tendencias en inteligencia artificial, arquitectura de software y computación cuántica. Esta cumbre anual reúne a líderes de la industria y pioneros académicos para un día de talleres intensivos y networking.\n\nPerfecto para estudiantes que buscan cerrar la brecha entre la teoría y la práctica industrial. Se proporcionarán café, materiales y oportunidades para hacer contactos.',
    date: '2026-03-25',
    time: '17:00',
    endTime: '19:00',
    type: 'charla',
    buildingId: 'CO',
    buildingName: 'Edificio Computación',
    roomId: 'CO-AUC1',
    roomName: 'AUC - 1 (Mini Auditorio)',
    organizer: 'Asociación de Computación',
    capacity: 30,
    available: 15,
    price: 'FREE',
    featured: true,
    icon: 'rocket',
    createdBy: 'admin@itcr.ac.cr',
  },
  {
    id: 2,
    title: 'Black & White Party',
    description: 'Fiesta temática en blanco y negro.',
    longDescription: 'Una fiesta temática en blanco y negro abierta a toda la comunidad TEC.',
    date: '2026-03-25',
    time: '17:00',
    endTime: '22:00',
    type: 'feria',
    buildingId: 'GY',
    buildingName: 'Gimnasio TEC',
    roomId: 'GY-GIMNASIO',
    roomName: 'Gimnasio TEC',
    organizer: 'FEITEC',
    capacity: 500,
    available: 3,
    price: 'FREE',
    createdBy: 'admin@itcr.ac.cr',
  },
  {
    id: 3,
    title: 'Black & White Party',
    description: 'Segunda edición nocturna.',
    longDescription: 'Segunda edición.',
    date: '2026-03-25',
    time: '17:00',
    endTime: '22:00',
    type: 'feria',
    buildingId: 'GY',
    buildingName: 'Gimnasio TEC',
    roomId: 'GY-CAMPO',
    roomName: 'Áreas Deportivas',
    organizer: 'FEITEC',
    capacity: 500,
    price: '20000',
    availabilityLabel: 'Asistencia abierta',
    createdBy: 'admin@itcr.ac.cr',
  },
  {
    id: 4,
    title: 'Black & White Party',
    description: 'Versión académica.',
    longDescription: 'Versión académica.',
    date: '2026-03-25',
    time: '17:00',
    endTime: '22:00',
    type: 'charla',
    buildingId: 'CE',
    buildingName: 'Edificio Ciencias Exactas',
    roomId: 'CE-A3',
    roomName: 'A - 3',
    organizer: 'FEITEC',
    capacity: 500,
    available: 300,
    price: 'FREE',
    createdBy: 'admin@itcr.ac.cr',
  },
  {
    id: 5,
    title: 'Innovación en IA: El Futuro del Trabajo',
    description: 'Charla académica sobre IA y futuro del trabajo.',
    longDescription:
      'Explora las últimas tendencias en inteligencia artificial, arquitectura de software y computación cuántica. Esta cumbre anual reúne a líderes de la industria y pioneros académicos para un día de talleres intensivos y networking.\n\nPerfecto para estudiantes que buscan cerrar la brecha entre la teoría y la práctica industrial. Se proporcionarán café, materiales y oportunidades para hacer contactos.',
    date: '2026-03-25',
    time: '09:00',
    endTime: '17:00',
    type: 'charla',
    buildingId: 'CTEC',
    buildingName: 'CTEC',
    roomId: 'CTEC-AUDITORIO',
    roomName: 'Auditorio CTEC',
    organizer: 'Asociación de Computación',
    capacity: 30,
    available: 30,
    price: 'FREE',
    badge: 'Charla Académica',
    createdBy: 'admin@itcr.ac.cr',
  },
  {
    id: 6,
    title: 'Hackathon TEC 2026',
    description: 'Competencia de 24 horas.',
    longDescription: 'Competencia de programación de 24 horas.',
    date: '2026-04-20',
    time: '08:00',
    endTime: '08:00',
    type: 'competencia',
    buildingId: 'CO',
    buildingName: 'Edificio Computación',
    roomId: 'CO-LAB1',
    roomName: 'Lab - 1',
    organizer: 'Escuela de Computación',
    capacity: 50,
    available: 50,
    price: 'FREE',
    createdBy: 'admin@itcr.ac.cr',
  },
]

const JOINED_KEY = 'ubicatec:joined-events'
const DRAFT_KEY = 'ubicatec:event-draft'
let DRAFT_EVENT = (() => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) }
  catch { return null }
})()

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms))

export async function getEvents() {
  await delay()
  return [...SEED_EVENTS]
}

export async function getEventById(id) {
  await delay()
  return SEED_EVENTS.find((e) => e.id === Number(id)) || null
}

export async function createEvent(eventData) {
  await delay()
  const newEvent = { ...eventData, id: Math.max(0, ...SEED_EVENTS.map((e) => e.id)) + 1, createdAt: Date.now() }
  SEED_EVENTS = [...SEED_EVENTS, newEvent]
  return { success: true, message: 'Evento creado exitosamente', id: newEvent.id }
}

export async function updateEvent(id, eventData) {
  await delay()
  SEED_EVENTS = SEED_EVENTS.map((e) => (e.id === Number(id) ? { ...e, ...eventData } : e))
  return { success: true, message: 'Evento actualizado exitosamente' }
}

export async function deleteEvent(id) {
  await delay()
  SEED_EVENTS = SEED_EVENTS.filter((e) => e.id !== Number(id))
  return { success: true, message: 'Evento eliminado exitosamente' }
}

export function filterEvents(events, { date, type, roomId }) {
  return events.filter((event) => {
    if (date && event.date !== date) return false
    if (type && event.type !== type) return false
    if (roomId && event.roomId !== roomId) return false
    return true
  })
}

export async function saveDraft(formData) {
  await delay(100)
  DRAFT_EVENT = { ...formData, savedAt: Date.now() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(DRAFT_EVENT))
  return { success: true }
}

export async function loadDraft() {
  await delay(50)
  return DRAFT_EVENT
}

export async function clearDraft() {
  DRAFT_EVENT = null
  localStorage.removeItem(DRAFT_KEY)
}

// ── Event join persistence ──

export function joinEvent(eventId) {
  const joined = getJoinedEvents()
  if (!joined.includes(eventId)) {
    joined.push(eventId)
    localStorage.setItem(JOINED_KEY, JSON.stringify(joined))
  }
  // Decrease available in memory
  const ev = SEED_EVENTS.find((e) => e.id === Number(eventId))
  if (ev && ev.capacity > 0 && ev.available > 0) {
    ev.available -= 1
  }
}

export function getJoinedEvents() {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY)) || [] }
  catch { return [] }
}

export function hasJoinedEvent(eventId) {
  return getJoinedEvents().includes(Number(eventId))
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
