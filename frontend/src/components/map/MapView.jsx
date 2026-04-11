import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, ImageOverlay, Rectangle, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import campusMap1 from '../../assets/campus-map.svg'
import campusMap2 from '../../assets/campus-map2.svg'
import markerPin from '../../assets/marker-pin.svg'
import { getBuildings, getCampus } from '../../services/mapService'
import RouteLine from './RouteLine'

const FLOOR_MAPS = { 1: campusMap1, 2: campusMap2 }

const pinIcon = L.icon({
  iconUrl: markerPin,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  className: 'ubicatec-pin',
})

const userLocIcon = L.divIcon({
  className: 'ubicatec-user-loc',
  html: '<div class="ubicatec-user-loc__dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function MapClickClear({ onClear, onDoubleClick, imgH }) {
  const clickTimer = useRef(null)
  useMapEvents({
    click: () => {
      // Delay single click to distinguish from double-click
      clearTimeout(clickTimer.current)
      clickTimer.current = setTimeout(() => {
        onClear && onClear()
      }, 250)
    },
    dblclick: (e) => {
      // Cancel the pending single-click clear
      clearTimeout(clickTimer.current)
      if (!onDoubleClick) return
      L.DomEvent.stopPropagation(e)
      const { lat, lng } = e.latlng
      onDoubleClick([lng, imgH - lat])
    },
  })
  return null
}

function FlyToSelection({ bounds, onArrive }) {
  const map = useMap()
  useEffect(() => {
    if (!bounds) return
    const targetZoom = 0.4
    const center = L.latLngBounds(bounds).getCenter()
    // Shift the target up on screen by ~120px so the popup doesn't cover it
    const point = map.project(center, targetZoom).add([0, 120])
    const shifted = map.unproject(point, targetZoom)
    map.flyTo(shifted, targetZoom, {
      duration: 0.7,
      easeLinearity: 0.25,
    })
    const handle = () => {
      onArrive && onArrive()
      map.off('moveend', handle)
    }
    map.on('moveend', handle)
    return () => map.off('moveend', handle)
  }, [bounds, map, onArrive])
  return null
}

/**
 * Architectural map: ImageOverlay + invisible clickable Rectangles per room.
 * Selected room shows a pin in its center; clicking outside clears selection.
 */
const FADE_MS = 350

// Custom react-leaflet hook-style component that crossfades two overlays
function FloorOverlay({ url, bounds }) {
  const [layers, setLayers] = useState(() => [{ id: 0, url, opacity: 1 }])
  const idRef = useRef(0)
  const prevUrlRef = useRef(url)

  useEffect(() => {
    if (prevUrlRef.current === url) return
    prevUrlRef.current = url
    idRef.current += 1
    const newId = idRef.current
    // Add the new layer with opacity 0 on top of the existing one(s)
    setLayers((prev) => [...prev, { id: newId, url, opacity: 0 }])
    // Next frame: fade it in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLayers((prev) =>
          prev.map((l) => (l.id === newId ? { ...l, opacity: 1 } : l)),
        )
      })
    })
    // After the transition, drop the old layers
    const t = setTimeout(() => {
      setLayers((prev) => prev.filter((l) => l.id === newId))
    }, FADE_MS + 50)
    return () => clearTimeout(t)
  }, [url])

  return layers.map((layer) => (
    <ImageOverlay
      key={layer.id}
      url={layer.url}
      bounds={bounds}
      opacity={layer.opacity}
      eventHandlers={{
        add: (e) => {
          const el = e.target.getElement()
          if (el) {
            el.style.transition = `opacity ${FADE_MS}ms ease`
            el.style.willChange = 'opacity'
          }
        },
      }}
    />
  ))
}

export default function MapView({ onRoomSelect, selectedRoomId, onClear, floor, routePath, userLocation, onSetUserLocation }) {
  const campus = getCampus()
  const buildings = getBuildings()
  const [imgW, imgH] = campus.imageSize

  const currentMap = useMemo(() => FLOOR_MAPS[floor] || campusMap1, [floor])

  const mapBounds = [
    [0, 0],
    [imgH, imgW],
  ]

  const toLeafletBounds = ([[x1, y1], [x2, y2]]) => [
    [imgH - y1, x1],
    [imgH - y2, x2],
  ]
  const toLeafletPoint = (x, y) => [imgH - y, x]

  const [cx, cy] = campus.initialCenter
  const center = [imgH - cy, cx]

  // Desktop gets more zoom since more screen space is available
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024
  const initialZoom = isDesktop ? -1 : campus.initialZoom

  const hiddenStyle = { color: '#e94560', weight: 0, fillOpacity: 0, fillColor: '#e94560' }
  const hoverStyle = { weight: 3, fillOpacity: 0.18 }

  // Hide the highlight rectangle while the camera is animating; show it again
  // once the fly-to settles. Avoids the misaligned-during-flight artifact.
  // Track which room id we're highlighting; when selection changes, reset.
  const [highlightedId, setHighlightedId] = useState(null)
  const showHighlight = (id) => setHighlightedId(id)
  if (!selectedRoomId && highlightedId !== null) {
    // Reset on deselect (sync, no extra render)
    setHighlightedId(null)
  }
  const isHighlighted = (id) => id === selectedRoomId && id === highlightedId

  // Find selected room/building and compute pin + bounds for fly-to
  let selectedPin = null
  let selectedBounds = null
  if (selectedRoomId) {
    let found = null
    for (const b of buildings) {
      const r = b.rooms.find((rr) => rr.id === selectedRoomId)
      if (r && r.bounds) { found = r; break }
      if (b.id === selectedRoomId && b.bounds) {
        found = { bounds: b.bounds }
        break
      }
    }
    if (found) {
      const [[x1, y1], [x2, y2]] = found.bounds
      selectedPin = toLeafletPoint((x1 + x2) / 2, (y1 + y2) / 2)
      selectedBounds = toLeafletBounds(found.bounds)
    }
  }

  return (
    <MapContainer
      crs={L.CRS.Simple}
      center={center}
      zoom={initialZoom}
      minZoom={campus.minZoom}
      maxZoom={campus.maxZoom}
      maxBounds={mapBounds}
      maxBoundsViscosity={1.0}
      scrollWheelZoom
      doubleClickZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="ubicatec-map"
      style={{ height: '100%', width: '100%' }}
    >
      <FloorOverlay url={currentMap} bounds={mapBounds} />
      <MapClickClear onClear={onClear} onDoubleClick={onSetUserLocation} imgH={imgH} />

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={toLeafletPoint(userLocation[0], userLocation[1])}
          icon={userLocIcon}
          interactive={false}
        />
      )}
      <FlyToSelection bounds={selectedBounds} onArrive={() => showHighlight(selectedRoomId)} />

      {buildings.flatMap((building) => {
        // Does this building have any room on the active floor?
        const hasRoomsOnFloor =
          floor == null || building.rooms.some((r) => r.floor === floor)

        // If yes: render rooms of this floor (clickable per room).
        // If no: render the WHOLE building footprint as a single clickable area
        //   (the building stays visible+selectable but its floor-1 rooms are not).
        if (hasRoomsOnFloor) {
          return building.rooms
            .filter((r) => r.bounds && (floor == null || r.floor === floor))
            .map((room) => {
              const isSelected = isHighlighted(room.id)
              return (
                <Rectangle
                  key={`${floor}-${room.id}`}
                  bounds={toLeafletBounds(room.bounds)}
                  className="ubicatec-highlight"
                  pathOptions={isSelected ? { ...hiddenStyle, ...hoverStyle } : hiddenStyle}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e)
                      onRoomSelect && onRoomSelect({ room, building })
                    },
                    mouseover: (e) => {
                      if (!isSelected) e.target.setStyle(hoverStyle)
                    },
                    mouseout: (e) => {
                      if (!isSelected) e.target.setStyle(hiddenStyle)
                    },
                  }}
                />
              )
            })
        }

        // Building has no rooms on this floor → make the whole footprint clickable
        if (!building.bounds) return []
        const buildingRoom = {
          id: building.id,
          name: building.name,
          floor,
          type: 'edificio',
          capacity: 0,
          bounds: building.bounds,
        }
        const isSelected = isHighlighted(building.id)
        return [
          <Rectangle
            key={`${floor}-building-${building.id}`}
            bounds={toLeafletBounds(building.bounds)}
            className="ubicatec-highlight"
            pathOptions={isSelected ? { ...hiddenStyle, ...hoverStyle } : hiddenStyle}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                onRoomSelect && onRoomSelect({ room: buildingRoom, building })
              },
              mouseover: (e) => {
                if (!isSelected) e.target.setStyle(hoverStyle)
              },
              mouseout: (e) => {
                if (!isSelected) e.target.setStyle(hiddenStyle)
              },
            }}
          />,
        ]
      })}

      {selectedPin && highlightedId === selectedRoomId && (
        <Marker
          position={selectedPin}
          icon={pinIcon}
          interactive={false}
          keyboard={false}
        />
      )}

      {routePath && routePath.length >= 2 && (
        <RouteLine key={routePath.length + '-' + routePath[0].join(',')} path={routePath} imgH={imgH} />
      )}
    </MapContainer>
  )
}
