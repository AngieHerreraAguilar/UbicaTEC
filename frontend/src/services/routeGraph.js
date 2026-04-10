import { routeSources, DEFAULT_START } from '../data/routes-svg'

export { DEFAULT_START }

/**
 * Parse an SVG path `d` attribute into a list of [x, y] points.
 * Supports M, H, V, L commands (absolute only). Curves (C) are
 * simplified to a straight line from current to endpoint.
 */
function parseSvgPath(d) {
  const points = []
  let x = 0, y = 0
  // Tokenize: split on command letters, keeping the letter
  const tokens = d.match(/[MHVLCZ][^MHVLCZ]*/gi) || []
  for (const token of tokens) {
    const cmd = token[0].toUpperCase()
    const nums = token.slice(1).trim().match(/-?[\d.]+/g)?.map(Number) || []
    switch (cmd) {
      case 'M':
        x = nums[0]; y = nums[1]
        points.push([x, y])
        break
      case 'H':
        x = nums[0]
        points.push([x, y])
        break
      case 'V':
        y = nums[0]
        points.push([x, y])
        break
      case 'L':
        x = nums[0]; y = nums[1]
        points.push([x, y])
        break
      case 'C':
        // Cubic bezier: C cx1,cy1 cx2,cy2 x,y — take endpoint only
        x = nums[4]; y = nums[5]
        points.push([x, y])
        break
      default:
        break
    }
  }
  return points
}

/**
 * Snap a coordinate to a grid to merge nearby points as the same node.
 * This handles routes that share corridors but have slightly different coords
 * (e.g. 1419 vs 1420.5 vs 1422.5 → all snap to the same node).
 */
const SNAP = 12
function snap(v) { return Math.round(v / SNAP) * SNAP }
function nodeId(x, y) { return `${snap(x)},${snap(y)}` }

/**
 * Build a navigation graph from all SVG route sources.
 * Returns { nodes: { id: [x,y] }, adj: { id: [{ to, weight }] } }
 */
function buildGraphFromRoutes() {
  const nodes = {}   // id → [x, y] (snapped)
  const edgeSet = new Set()
  const adj = {}

  function addNode(x, y) {
    const id = nodeId(x, y)
    if (!nodes[id]) {
      nodes[id] = [snap(x), snap(y)]
      adj[id] = []
    }
    return id
  }

  function addEdge(id1, id2) {
    if (id1 === id2) return
    const key = id1 < id2 ? `${id1}|${id2}` : `${id2}|${id1}`
    if (edgeSet.has(key)) return
    edgeSet.add(key)
    const [x1, y1] = nodes[id1]
    const [x2, y2] = nodes[id2]
    const w = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    adj[id1].push({ to: id2, w })
    adj[id2].push({ to: id1, w })
  }

  for (const source of routeSources) {
    const [ox, oy] = source.frameOffset
    for (const d of source.paths) {
      const localPts = parseSvgPath(d)
      const globalPts = localPts.map(([x, y]) => [x + ox, y + oy])
      let prevId = null
      for (const [x, y] of globalPts) {
        const id = addNode(x, y)
        if (prevId) addEdge(prevId, id)
        prevId = id
      }
    }
  }

  return { nodes, adj }
}

// Build once at import time
const graph = buildGraphFromRoutes()

function dist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

/**
 * Find the closest graph node to a given [x, y] point.
 */
export function findClosestNode(point) {
  let bestId = null
  let bestDist = Infinity
  for (const [id, coords] of Object.entries(graph.nodes)) {
    const d = dist(point, coords)
    if (d < bestDist) { bestDist = d; bestId = id }
  }
  return bestId
}

/**
 * A* pathfinding on the route graph.
 * Returns [[x,y], ...] or null.
 */
export function findRouteBetween(startPoint, endPoint) {
  const startId = findClosestNode(startPoint)
  const endId = findClosestNode(endPoint)
  if (!startId || !endId) return null
  if (startId === endId) return [startPoint, graph.nodes[endId]]

  const goal = graph.nodes[endId]
  const open = new Set([startId])
  const cameFrom = {}
  const gScore = { [startId]: 0 }
  const fScore = { [startId]: dist(graph.nodes[startId], goal) }

  while (open.size > 0) {
    let current = null
    let best = Infinity
    for (const id of open) {
      const f = fScore[id] ?? Infinity
      if (f < best) { best = f; current = id }
    }
    if (current === endId) {
      const path = [graph.nodes[endId]]
      let c = endId
      while (cameFrom[c]) { c = cameFrom[c]; path.push(graph.nodes[c]) }
      path.reverse()
      // Prepend actual start and append actual end for precision
      return [startPoint, ...path, endPoint]
    }

    open.delete(current)
    for (const { to, w } of graph.adj[current] || []) {
      const tentG = (gScore[current] ?? Infinity) + w
      if (tentG < (gScore[to] ?? Infinity)) {
        cameFrom[to] = current
        gScore[to] = tentG
        fScore[to] = tentG + dist(graph.nodes[to], goal)
        open.add(to)
      }
    }
  }
  return null
}

/**
 * Debug: get all graph nodes and edges for visualization.
 */
export function getGraphDebug() {
  return graph
}
