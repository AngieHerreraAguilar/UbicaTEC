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
    buildingId: 'B1',
    buildingName: 'Edificio A',
    roomId: 'B1-201',
    roomName: 'Aula 201',
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
    buildingId: 'B4',
    buildingName: 'Gimnasio TEC',
    roomId: 'B4-GIM',
    roomName: 'Gimnasio Principal',
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
    buildingId: 'B4',
    buildingName: 'Gimnasio TEC',
    roomId: 'B4-GIM',
    roomName: 'Gimnasio Principal',
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
    buildingId: 'B4',
    buildingName: 'Gimnasio TEC',
    roomId: 'B4-GIM',
    roomName: 'Gimnasio Principal',
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
    buildingId: 'B2',
    buildingName: 'Edificio Computación',
    roomId: 'B2-101',
    roomName: 'Mini Auditorio | AUC - 1',
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
    buildingId: 'B1',
    buildingName: 'Edificio A',
    roomId: 'B1-301',
    roomName: 'Sala de Cómputo 301',
    organizer: 'Escuela de Computación',
    capacity: 50,
    available: 50,
    price: 'FREE',
    createdBy: 'admin@itcr.ac.cr',
  },
]

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
  const newEvent = { ...eventData, id: Math.max(0, ...SEED_EVENTS.map((e) => e.id)) + 1 }
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

export function paginateEvents(events, page, pageSize = 10) {
  const start = (page - 1) * pageSize
  return {
    data: events.slice(start, start + pageSize),
    total: events.length,
    totalPages: Math.max(1, Math.ceil(events.length / pageSize)),
    currentPage: page,
  }
}
