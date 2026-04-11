import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import './AppLayout.css'

export default function AppLayout() {
  const location = useLocation()
  const isMap = location.pathname === '/mapa'
  const hideNav = location.pathname === '/crear-evento' || location.pathname.startsWith('/evento/')
  return (
    <div className={'app-layout device-frame' + (isMap ? ' app-layout--map' : '') + (hideNav ? ' app-layout--no-nav' : '')}>
      <main className="app-layout__main">
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
