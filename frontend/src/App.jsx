import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Splash from './components/shared/Splash'
import AppLayout from './components/shared/AppLayout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import MapPage from './components/map/MapPage'
import EventsPage from './components/events/EventsPage'
import EventDetailPage from './components/events/EventDetailPage'
import CreateEventPage from './components/events/CreateEventPage'
import LoginPage from './components/auth/LoginPage'

function App() {
  // Apply saved theme on boot (before first paint ideally, but here is fine)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const dark = saved
      ? saved === 'dark'
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/eventos" element={<EventsPage />} />
        <Route path="/evento/:id" element={<EventDetailPage />} />
        <Route element={<ProtectedRoute action="create" />}>
          <Route path="/crear-evento" element={<CreateEventPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Splash />} />
    </Routes>
  )
}

export default App
