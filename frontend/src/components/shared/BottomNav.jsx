import { NavLink, useLocation } from 'react-router-dom'
import iconMap from '../../assets/icon-map.svg'
import iconTicket from '../../assets/icon-ticket.svg'
import './BottomNav.css'

const TABS = [
  { to: '/mapa', label: 'Mapa', icon: iconMap, iconPosition: 'right' },
  { to: '/eventos', label: 'Eventos', icon: iconTicket, iconPosition: 'left' },
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
              <img src={tab.icon} alt="" className="bottom-nav__icon" aria-hidden="true" />
            )}
            <span className="bottom-nav__label">{tab.label}</span>
            {tab.iconPosition === 'right' && (
              <img src={tab.icon} alt="" className="bottom-nav__icon" aria-hidden="true" />
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
