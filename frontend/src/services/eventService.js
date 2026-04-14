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

// ── API calls (Azure API Management) ──

export async function getEvents() {
  const url = `${BASE_URL}/`
  const response = await fetch(url, { headers })
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function getEventById(id) {
  const response = await fetch(`${BASE_URL}/${id}`, { headers })
  return response.json()
}

export async function createEvent(eventData) {
  const response = await fetch(`${BASE_URL}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(eventData),
  })
  return response.json()
}

export async function updateEvent(id, eventData) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(eventData),
  })
  return response.json()
}

export async function deleteEvent(id) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers,
  })
  return response.json()
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

export function joinEvent(eventId) {
  const joined = getJoinedEvents()
  if (!joined.includes(eventId)) {
    joined.push(eventId)
    localStorage.setItem(JOINED_KEY, JSON.stringify(joined))
  }
}

export function getJoinedEvents() {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY)) || [] }
  catch { return [] }
}

export function hasJoinedEvent(eventId) {
  return getJoinedEvents().includes(Number(eventId))
}
