import { useRef, useState } from 'react'
import FeaturedEventCard from './FeaturedEventCard'
import './FeaturedCarousel.css'

export default function FeaturedCarousel({ events }) {
  const scrollRef = useRef(null)
  const [active, setActive] = useState(0)

  if (!events || events.length === 0) return null
  if (events.length === 1) return <FeaturedEventCard event={events[0]} />

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / el.offsetWidth)
    setActive(idx)
  }

  const scrollTo = (idx) => {
    scrollRef.current?.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'smooth' })
  }

  return (
    <div className="fc">
      <div className="fc__track" ref={scrollRef} onScroll={handleScroll}>
        {events.map((ev) => (
          <div key={ev.id} className="fc__slide">
            <FeaturedEventCard event={ev} />
          </div>
        ))}
      </div>
      <div className="fc__dots">
        {events.map((_, i) => (
          <button
            key={i}
            type="button"
            className={'fc__dot' + (i === active ? ' is-active' : '')}
            onClick={() => scrollTo(i)}
            aria-label={`Evento ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
