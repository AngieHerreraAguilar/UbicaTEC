import { useEffect, useRef, useState } from 'react'
import { Polyline, CircleMarker, useMap } from 'react-leaflet'

/**
 * Animated route polyline that draws itself from start to end.
 * `path` is [[x,y], ...] in SVG pixel coords.
 * `imgH` is the SVG image height (for Y-flip to Leaflet CRS.Simple).
 */
export default function RouteLine({ path, imgH }) {
  const map = useMap()
  const [progress, setProgress] = useState(0)
  const animRef = useRef(null)

  // Convert SVG [x, y] to Leaflet [lat, lng] with Y-flip
  const toLL = ([x, y]) => [imgH - y, x]

  // Total path length
  const segments = []
  let totalLen = 0
  for (let i = 1; i < path.length; i++) {
    const d = Math.sqrt(
      (path[i][0] - path[i - 1][0]) ** 2 + (path[i][1] - path[i - 1][1]) ** 2,
    )
    segments.push(d)
    totalLen += d
  }

  // Animate progress 0 → 1 over duration proportional to length
  useEffect(() => {
    const duration = Math.min(2500, Math.max(800, totalLen * 0.8))
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out cubic
      const eased = 1 - (1 - t) ** 3
      setProgress(eased)
      if (t < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [totalLen])

  // Build the visible portion of the path based on progress
  const visiblePath = []
  let remaining = progress * totalLen
  visiblePath.push(toLL(path[0]))
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= 0) break
    if (remaining >= segments[i]) {
      visiblePath.push(toLL(path[i + 1]))
      remaining -= segments[i]
    } else {
      // Partial segment
      const frac = remaining / segments[i]
      const interp = [
        path[i][0] + (path[i + 1][0] - path[i][0]) * frac,
        path[i][1] + (path[i + 1][1] - path[i][1]) * frac,
      ]
      visiblePath.push(toLL(interp))
      remaining = 0
    }
  }

  const tip = visiblePath[visiblePath.length - 1]

  // Fit the map to the full route when animation starts
  useEffect(() => {
    if (path.length < 2) return
    const latlngs = path.map(toLL)
    const bounds = L_latLngBounds(latlngs)
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 0.5, duration: 0.5 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Background dashed line (full route, faded) */}
      <Polyline
        positions={path.map(toLL)}
        pathOptions={{
          color: '#e94560',
          weight: 4,
          opacity: 0.15,
          dashArray: '8 8',
        }}
      />
      {/* Animated solid line */}
      {visiblePath.length >= 2 && (
        <Polyline
          positions={visiblePath}
          pathOptions={{
            color: '#e94560',
            weight: 4,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}
      {/* Moving tip dot */}
      {tip && (
        <CircleMarker
          center={tip}
          radius={7}
          pathOptions={{
            fillColor: '#e94560',
            fillOpacity: 1,
            color: '#fff',
            weight: 3,
            opacity: 1,
          }}
        />
      )}
      {/* Start dot */}
      <CircleMarker
        center={toLL(path[0])}
        radius={6}
        pathOptions={{
          fillColor: '#16213e',
          fillOpacity: 1,
          color: '#fff',
          weight: 2,
          opacity: 1,
        }}
      />
    </>
  )
}

// Inline helper to avoid importing L just for this
function L_latLngBounds(arr) {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const [lat, lng] of arr) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  return [[minLat, minLng], [maxLat, maxLng]]
}
