// Map Service (Persona 2 — Angie)
// Fase I: lee de campus.json local. En Fase II se migraría a un backend real.
import campusData from '../data/campus.json'

export function getCampus() {
  return campusData.campus
}

export function getBuildings() {
  return campusData.buildings
}

export function getBuildingById(id) {
  return campusData.buildings.find((b) => b.id === id) || null
}

export function getRoomById(roomId) {
  for (const b of campusData.buildings) {
    const room = b.rooms.find((r) => r.id === roomId)
    if (room) return { ...room, building: b }
  }
  return null
}

export function searchBuildings(query) {
  if (!query) return campusData.buildings
  const q = query.toLowerCase()
  return campusData.buildings.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.rooms.some((r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
  )
}

/**
 * Search rooms and buildings, returning flat results with building context.
 * Each result has: { id, name, buildingName, buildingId, floor, type, bounds }
 */
const norm = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function searchAll(query) {
  if (!query || query.length < 1) return []
  const q = norm(query).trim()
  const results = []
  for (const b of campusData.buildings) {
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
  // Deduplicate (if a building matched both ways) and cap at 12 results
  const seen = new Set()
  return results.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  }).slice(0, 12)
}

export function getAvailableFloors() {
  const floors = new Set()
  for (const b of campusData.buildings) {
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
import pathwayData from '../data/pathways.json'
import { findRouteBetween, DEFAULT_START } from './routeGraph'

function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function buildGraph() {
  const { waypoints, edges } = pathwayData
  const adj = {}
  for (const id of Object.keys(waypoints)) adj[id] = []
  for (const [a, b] of edges) {
    const w = dist(waypoints[a], waypoints[b])
    adj[a].push({ to: b, w })
    adj[b].push({ to: a, w })
  }
  return adj
}

/**
 * A* pathfinding from startId to goalId in the waypoint graph.
 * Returns an array of [x, y] coordinates (SVG pixel space) or null.
 */
export function findRoute(startId, goalId) {
  const { waypoints } = pathwayData
  if (!waypoints[startId] || !waypoints[goalId]) return null
  if (startId === goalId) return [waypoints[startId]]

  const adj = buildGraph()
  const goal = waypoints[goalId]

  // A* with Euclidean heuristic
  const open = new Set([startId])
  const cameFrom = {}
  const gScore = { [startId]: 0 }
  const fScore = { [startId]: dist(waypoints[startId], goal) }

  while (open.size > 0) {
    // Pick node in open with lowest fScore
    let current = null
    let best = Infinity
    for (const id of open) {
      const f = fScore[id] ?? Infinity
      if (f < best) { best = f; current = id }
    }
    if (current === goalId) {
      // Reconstruct path
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
  return null // no path found
}

/**
 * Get the waypoint ID for a given building (or room's building).
 */
export function getBuildingWaypoint(buildingId) {
  return pathwayData.buildingConnections[buildingId] || null
}

export function getDefaultStart() {
  return pathwayData.defaultStart
}

/**
 * Find route from the Edificio Administrativo entrance to a room/building.
 * Returns [x, y][] in SVG pixel coordinates.
 */
export function findRouteToRoom(buildingId) {
  const target = buildingCenter(buildingId)
  if (target) {
    const route = findRouteBetween(DEFAULT_START, target)
    if (route) return route
  }
  return null
}

/**
 * Find the closest waypoint to an arbitrary [x, y] point in SVG coords.
 */
export function findClosestWaypoint(point) {
  const { waypoints } = pathwayData
  let best = null
  let bestDist = Infinity
  for (const [id, coords] of Object.entries(waypoints)) {
    const d = dist(point, coords)
    if (d < bestDist) { bestDist = d; best = id }
  }
  return best
}

/**
 * Find route from an arbitrary SVG point to a building.
 */
export function findRouteFromPoint(startPoint, buildingId) {
  const target = buildingCenter(buildingId)
  if (target) {
    const route = findRouteBetween(startPoint, target)
    if (route) return route
  }
  return null
}

// ── Predefined routes ──

/**
 * Get the center of a building's bounds.
 */
function buildingCenter(buildingId) {
  const b = campusData.buildings.find((bb) => bb.id === buildingId)
  if (!b || !b.bounds) return null
  const [[x1, y1], [x2, y2]] = b.bounds
  return [(x1 + x2) / 2, (y1 + y2) / 2]
}

