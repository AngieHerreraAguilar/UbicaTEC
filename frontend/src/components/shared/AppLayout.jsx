import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import './AppLayout.css'

export default function AppLayout() {
  const location = useLocation()
  const isMap = location.pathname === '/mapa'
  return (
    <div className={'app-layout device-frame' + (isMap ? ' app-layout--map' : '')}>
      <main className="app-layout__main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
