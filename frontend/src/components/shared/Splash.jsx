import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { initMapData } from '../../services/mapService'
import watermarkBg from '../../assets/MapWatermarkBG.svg'
import './Splash.css'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    // Load map data from API, then navigate (min 1.5s for branding)
    const min = new Promise((r) => setTimeout(r, 1500))
    Promise.all([initMapData(), min]).then(() => {
      navigate('/mapa', { replace: true })
    })
  }, [navigate])

  return (
    <div className="splash device-frame">
      <div className="splash__watermark" aria-hidden="true">
        <img src={watermarkBg} alt="" className="splash__watermark-img" draggable={false} />
        <div className="splash__glow" />
      </div>
      <div className="splash__content">
        <div className="splash__logo-wrap">
          <i className="fi fi-rr-marker splash__pin" aria-hidden="true" />
          <h1 className="splash__title">
            Ubica<span className="accent">TEC</span>
          </h1>
          <p className="splash__subtitle">mapa virtual</p>
        </div>
        <div className="splash__loader">
          <div className="spinner" aria-hidden="true" />
          <p className="splash__loading-text">Cargando...</p>
        </div>
      </div>
    </div>
  )
}
