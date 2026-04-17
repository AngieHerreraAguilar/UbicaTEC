// Map Service (Persona 2 — Angie)
// Fase I: datos servidos desde Azure API Management (mock).
// Fase II: backend real con base de datos.

const API_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL
const API_KEY = import.meta.env.VITE_API_KEY
const BASE_URL = `${API_GATEWAY}/map`

const headers = {
  'Ocp-Apim-Subscription-Key': API_KEY,
}

// ── Cache: fetch once, reuse ──
let campusCache = null
let pathwayCache = null

async function fetchCampusData() {
  if (campusCache) return campusCache
  const res = await fetch(`${BASE_URL}/campus`, { headers })
  campusCache = await res.json()
  return campusCache
}

async function fetchPathwayData() {
  if (pathwayCache) return pathwayCache
  const res = await fetch(`${BASE_URL}/pathways`, { headers })
  pathwayCache = await res.json()
  return pathwayCache
}

// ── Sync accessors (use after init) ──

export function getCampus() {
  return campusCache?.campus ?? null
}

export function getBuildings() {
  return campusCache?.buildings ?? []
}

export function getBuildingById(id) {
  return getBuildings().find((b) => b.id === id) || null
}

export function getRoomById(roomId) {
  for (const b of getBuildings()) {
    const room = b.rooms.find((r) => r.id === roomId)
    if (room) return { ...room, building: b }
  }
  return null
}

export function searchBuildings(query) {
  const buildings = getBuildings()
  if (!query) return buildings
  const q = query.toLowerCase()
  return buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.rooms.some((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
  )
}

/**
 * Search rooms and buildings, returning flat results with building context.
 */
const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function searchAll(query) {
  if (!query || query.length < 1) return []
  const q = norm(query).trim()
  const results = []
  for (const b of getBuildings()) {
    for (const r of b.rooms) {
      if (
        norm(r.name).includes(q) ||
        norm(r.id).includes(q) ||
        norm(r.type).includes(q)
      ) {
        results.push({
          id: r.id,
          name: r.name,
          buildingName: b.name,
          buildingId: b.id,
          floor: r.floor,
          type: r.type,
          bounds: r.bounds,
        })
      }
    }
    if (norm(b.name).includes(q)) {
      results.push({
        id: b.id,
        name: b.name,
        buildingName: null,
        buildingId: b.id,
        floor: null,
        type: 'edificio',
        bounds: b.bounds,
      })
    }
  }
  const seen = new Set()
  return results.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 12)
}

export function getAvailableFloors() {
  const floors = new Set()
  for (const b of getBuildings()) {
    for (const r of b.rooms) {
      if (r.floor != null) floors.add(r.floor)
    }
  }
  return [...floors].sort((a, b) => a - b)
}

export function getEventsForBuilding(buildingId, events) {
  if (!events) return []
  return events.filter((e) => e.buildingId === buildingId)
}

// ── Pathfinding ──
import { findRouteBetween, DEFAULT_START } from './routeGraph'

function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function buildGraph() {
  if (!pathwayCache) return {}
  const { waypoints, edges } = pathwayCache
  const adj = {}
  for (const id of Object.keys(waypoints)) adj[id] = []
  for (const [a, b] of edges) {
    const w = dist(waypoints[a], waypoints[b])
    adj[a].push({ to: b, w })
    adj[b].push({ to: a, w })
  }
  return adj
}

export function findRoute(startId, goalId) {
  if (!pathwayCache) return null
  const { waypoints } = pathwayCache
  if (!waypoints[startId] || !waypoints[goalId]) return null
  if (startId === goalId) return [waypoints[startId]]

  const adj = buildGraph()
  const goal = waypoints[goalId]

  const open = new Set([startId])
  const cameFrom = {}
  const gScore = { [startId]: 0 }
  const fScore = { [startId]: dist(waypoints[startId], goal) }

  while (open.size > 0) {
    let current = null
    let best = Infinity
    for (const id of open) {
      const f = fScore[id] ?? Infinity
      if (f < best) { best = f; current = id }
    }
    if (current === goalId) {
      const path = [waypoints[goalId]]
      let c = goalId
      while (cameFrom[c]) { c = cameFrom[c]; path.push(waypoints[c]) }
      return path.reverse()
    }

    open.delete(current)
    for (const { to, w } of adj[current] || []) {
      const tentG = (gScore[current] ?? Infinity) + w
      if (tentG < (gScore[to] ?? Infinity)) {
        cameFrom[to] = current
        gScore[to] = tentG
        fScore[to] = tentG + dist(waypoints[to], goal)
        open.add(to)
      }
    }
  }
  return null
}

export function getBuildingWaypoint(buildingId) {
  if (!pathwayCache) return null
  return pathwayCache.buildingConnections[buildingId] || null
}

export function getDefaultStart() {
  if (!pathwayCache) return null
  return pathwayCache.defaultStart
}

function buildingCenter(buildingId) {
  const b = getBuildings().find((bb) => bb.id === buildingId)
  if (!b || !b.bounds) return null
  const [[x1, y1], [x2, y2]] = b.bounds
  return [(x1 + x2) / 2, (y1 + y2) / 2]
}

export function findRouteToRoom(buildingId) {
  const target = buildingCenter(buildingId)
  if (target) {
    const route = findRouteBetween(DEFAULT_START, target)
    if (route) return route
  }
  return null
}

export function findClosestWaypoint(point) {
  if (!pathwayCache) return null
  const { waypoints } = pathwayCache
  let best = null
  let bestDist = Infinity
  for (const [id, coords] of Object.entries(waypoints)) {
    const d = dist(point, coords)
    if (d < bestDist) { bestDist = d; best = id }
  }
  return best
}

export function findRouteFromPoint(startPoint, buildingId) {
  const target = buildingCenter(buildingId)
  if (target) {
    const route = findRouteBetween(startPoint, target)
    if (route) return route
  }
  return null
}

// ── Init: fetch both datasets ──

export async function initMapData() {
  await Promise.all([fetchCampusData(), fetchPathwayData()])
}
