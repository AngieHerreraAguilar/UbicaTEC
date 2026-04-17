/* Thin wrappers around Flaticon uicons (loaded via CDN in index.html).
   Replacing inline SVGs that had corrupted path data.
   These render <i> elements that inherit CSS color automatically. */

export function IconCalendar({ size = 16, className = '' }) {
  return <i className={`fi fi-rr-calendar ${className}`} style={{ fontSize: size }} aria-hidden="true" />
}

export function IconClock({ size = 16, className = '' }) {
  return <i className={`fi fi-rr-clock ${className}`} style={{ fontSize: size }} aria-hidden="true" />
}

export function IconLocation({ size = 16, className = '' }) {
  return <i className={`fi fi-rr-marker ${className}`} style={{ fontSize: size }} aria-hidden="true" />
}

export function IconMap({ size = 24, className = '' }) {
  return <i className={`fi fi-rr-map ${className}`} style={{ fontSize: size }} aria-hidden="true" />
}

export function IconTicket({ size = 24, className = '' }) {
  return <i className={`fi fi-rr-ticket ${className}`} style={{ fontSize: size }} aria-hidden="true" />
}
