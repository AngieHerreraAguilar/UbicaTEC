import { useCallback, useEffect, useRef, useState } from 'react'
import FeaturedEventCard from './FeaturedEventCard'
import './FeaturedCarousel.css'

export default function FeaturedCarousel({ events }) {
  const trackRef = useRef(null)
  const [active, setActive] = useState(0)
  const drag = useRef({
    down: false, startX: 0, tx: 0, lastX: 0, lastT: 0, vx: 0, didDrag: false,
  })
  const rafId = useRef(null)
  const count = events?.length || 0

  // Current translateX from active index
  const slideX = useCallback(
    (idx) => {
      const el = trackRef.current
      return el ? -idx * el.offsetWidth : 0
    },
    [],
  )

  // Apply transform without triggering React re-render
  const applyTx = (tx) => {
    const el = trackRef.current
    if (el) el.style.transform = `translateX(${tx}px)`
  }

  const applyTransition = (on) => {
    const el = trackRef.current
    if (el) el.style.transition = on ? 'transform 0.38s cubic-bezier(.25,.1,.25,1)' : 'none'
  }

  // Snap to index with animation
  const snapTo = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(count - 1, idx))
    setActive(clamped)
    applyTransition(true)
    applyTx(slideX(clamped))
  }, [count, slideX])

  // After transition ends, kill the transition property
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onEnd = () => { el.style.transition = 'none' }
    el.addEventListener('transitionend', onEnd)
    return () => el.removeEventListener('transitionend', onEnd)
  }, [])

  // Set initial position
  useEffect(() => {
    applyTx(slideX(active))
  }, [active, slideX])

  if (!events || count === 0) return null
  if (count === 1) return <FeaturedEventCard event={events[0]} />

  const goPrev = () => snapTo(active - 1)
  const goNext = () => snapTo(active + 1)

  // ── Pointer handlers (touch + mouse) ──
  const onDown = (x) => {
    cancelAnimationFrame(rafId.current)
    applyTransition(false)
    drag.current = {
      down: true, startX: x, tx: slideX(active), lastX: x, lastT: Date.now(), vx: 0, didDrag: false,
    }
  }

  const onMove = (x) => {
    if (!drag.current.down) return
    const now = Date.now()
    const dt = now - drag.current.lastT || 1
    drag.current.vx = (x - drag.current.lastX) / dt
    drag.current.lastX = x
    drag.current.lastT = now

    const dx = x - drag.current.startX
    if (Math.abs(dx) > 4) drag.current.didDrag = true
    // Rubber-band at edges
    const raw = drag.current.tx + dx
    const maxTx = 0
    const minTx = -(count - 1) * (trackRef.current?.offsetWidth || 1)
    let tx = raw
    if (raw > maxTx) tx = maxTx + (raw - maxTx) * 0.3
    else if (raw < minTx) tx = minTx + (raw - minTx) * 0.3
    applyTx(tx)
  }

  const onUp = () => {
    if (!drag.current.down) return
    drag.current.down = false
    const el = trackRef.current
    if (!el) return

    const w = el.offsetWidth
    const dx = drag.current.lastX - drag.current.startX
    const vx = drag.current.vx // px/ms

    // Decide target: flick (velocity) or position-based
    let target = active
    if (Math.abs(vx) > 0.3) {
      target = vx < 0 ? active + 1 : active - 1
    } else if (Math.abs(dx) > w * 0.25) {
      target = dx < 0 ? active + 1 : active - 1
    }
    snapTo(target)
  }

  // Touch
  const handleTouchStart = (e) => onDown(e.touches[0].clientX)
  const handleTouchMove = (e) => onMove(e.touches[0].clientX)
  const handleTouchEnd = () => onUp()

  // Mouse
  const handleMouseDown = (e) => { if (e.button === 0) { onDown(e.clientX); e.preventDefault() } }
  const handleMouseMove = (e) => onMove(e.clientX)
  const handleMouseUp = () => onUp()

  // Block link navigation when dragging
  const handleClick = (e) => { if (drag.current.didDrag) e.preventDefault() }

  return (
    <div className="fc">
      <button
        type="button"
        className="fc__arrow fc__arrow--prev"
        onClick={goPrev}
        disabled={active === 0}
        aria-label="Anterior"
      >
        <i className="fi fi-rr-angle-left" />
      </button>
      <button
        type="button"
        className="fc__arrow fc__arrow--next"
        onClick={goNext}
        disabled={active === count - 1}
        aria-label="Siguiente"
      >
        <i className="fi fi-rr-angle-right" />
      </button>

      <div className="fc__viewport">
        <div
          className="fc__track"
          ref={trackRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClickCapture={handleClick}
        >
          {events.map((ev) => (
            <div key={ev.id} className="fc__slide">
              <FeaturedEventCard event={ev} />
            </div>
          ))}
        </div>
      </div>

      <div className="fc__dots">
        {events.map((_, i) => (
          <button
            key={i}
            type="button"
            className={'fc__dot' + (i === active ? ' is-active' : '')}
            onClick={() => snapTo(i)}
            aria-label={`Evento ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
