import { NavLink, useLocation } from 'react-router-dom'
import { IconMap, IconTicket } from './Icons'
import './BottomNav.css'

const TABS = [
  { to: '/mapa', label: 'Mapa', Icon: IconMap, iconPosition: 'right' },
  { to: '/eventos', label: 'Eventos', Icon: IconTicket, iconPosition: 'left' },
]

export default function BottomNav() {
  const location = useLocation()
  const isMap = location.pathname === '/mapa'
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => location.pathname.startsWith(t.to)),
  )

  return (
    <nav className={'bottom-nav' + (isMap ? ' bottom-nav--transparent' : '')} aria-label="Navegación principal">
      <div className="bottom-nav__brand" aria-hidden="true">
        Ubica<span className="accent">TEC</span>
      </div>
      <div className="bottom-nav__select" data-active={activeIndex}>
        <span className="bottom-nav__indicator" aria-hidden="true" />
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              'bottom-nav__tab' + (isActive ? ' is-active' : '')
            }
          >
            {tab.iconPosition === 'left' && (
              <tab.Icon size={24} className="bottom-nav__icon" />
            )}
            <span className="bottom-nav__label">{tab.label}</span>
            {tab.iconPosition === 'right' && (
              <tab.Icon size={24} className="bottom-nav__icon" />
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
