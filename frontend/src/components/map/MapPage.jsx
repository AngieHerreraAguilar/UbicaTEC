import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../shared/Header'
import MapView from './MapView'
import DestinationCard from './DestinationCard'
import FloorSelector from './FloorSelector'
import {
  getAvailableFloors, getBuildingById, getRoomById, searchAll,
  findRouteToRoom, findRouteFromPoint,
} from '../../services/mapService'
import './MapPage.css'

const EXIT_MS = 220

export default function MapPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromPage = params.get('from')
  const selectRoomId = params.get('select')

  const [selection, setSelection] = useState(null)
  const [visible, setVisible] = useState(null)
  const [exiting, setExiting] = useState(false)
  const exitTimer = useRef(null)
  const floors = getAvailableFloors()
  const [floor, setFloor] = useState(floors[0] || 1)

  const [searchResults, setSearchResults] = useState([])
  const [routePath, setRoutePath] = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  // Auto-select room when coming from create event form
  const didAutoSelect = useRef(false)
  useEffect(() => {
    if (selectRoomId && !didAutoSelect.current) {
      didAutoSelect.current = true
      const roomData = getRoomById(selectRoomId)
      if (roomData) {
        if (roomData.floor) setFloor(roomData.floor)
        setSelection({ room: roomData, building: roomData.building })
      }
    }
  }, [selectRoomId])

  const handleSearch = useCallback((query) => {
    setSearchResults(query ? searchAll(query) : [])
  }, [])

  const handleSelectResult = useCallback((item) => {
    if (!item) return
    let building = item.buildingId ? getBuildingById(item.buildingId) : null
    if (!building) {
      const found = getRoomById(item.id)
      building = found?.building || null
    }
    if (!building) return

    if (item.floor != null) setFloor(item.floor)

    const roomData = getRoomById(item.id)
    if (roomData) {
      setSelection({ room: roomData, building: roomData.building || building })
    } else {
      const synth = {
        id: building.id,
        name: building.name,
        floor: item.floor || floor,
        type: 'edificio',
        capacity: 0,
        bounds: building.bounds,
      }
      setSelection({ room: synth, building })
    }
    setSearchResults([])
    setRoutePath(null)
  }, [floor])

  useEffect(() => {
    if (selection) {
      clearTimeout(exitTimer.current)
      setVisible(selection)
      setExiting(false)
    } else if (visible) {
      setExiting(true)
      exitTimer.current = setTimeout(() => {
        setVisible(null)
        setExiting(false)
      }, EXIT_MS)
    }
    return () => clearTimeout(exitTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection])

  const handleFloorChange = (f) => {
    setSelection(null)
    setRoutePath(null)
    setFloor(f)
  }

  const handleClear = () => {
    setSelection(null)
    setRoutePath(null)
  }

  const handleExploreRoute = () => {
    if (!selection) return
    let path
    if (userLocation) {
      path = findRouteFromPoint(userLocation, selection.building.id)
    } else {
      path = findRouteToRoom(selection.building.id)
    }
    if (path) {
      setRoutePath(path)
      setSelection(null)
    }
  }

  const handleSetUserLocation = (point) => {
    setUserLocation(point)
    setRoutePath(null)
  }

  return (
    <div className="map-page">
      <Header
        searchResults={searchResults}
        onSearch={handleSearch}
        onSelectResult={handleSelectResult}
      />
      <FloorSelector floors={floors} value={floor} onChange={handleFloorChange} />
      <MapView
        floor={floor}
        onRoomSelect={(sel) => { setSelection(sel); setRoutePath(null) }}
        selectedRoomId={selection?.room.id}
        onClear={handleClear}
        routePath={routePath}
        userLocation={userLocation}
        onSetUserLocation={handleSetUserLocation}
      />
      {visible && (
        <DestinationCard
          room={visible.room}
          building={visible.building}
          exiting={exiting}
          onNavigate={handleExploreRoute}
          hasUserLocation={!!userLocation}
        />
      )}
      {fromPage && (
        <button
          type="button"
          className="map-page__back-form"
          onClick={() => navigate(-1)}
        >
          <i className="fi fi-rr-arrow-small-left" />
          <span>{fromPage === 'crear-evento' ? 'Volver al formulario' : 'Volver al evento'}</span>
        </button>
      )}
    </div>
  )
}
