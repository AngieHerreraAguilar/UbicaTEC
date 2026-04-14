/* Inline SVG icons — render as React so fill="currentColor" inherits CSS color.
   Replaces <img src="...svg"> which cannot respond to dark-mode color changes. */

export function IconCalendar({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <g clipPath="url(#ic-cal)">
        <path d="M14 1.333H12V0h-1.333v1.333H5.333V0H4v1.333H2A2 2 0 000 3.333V16h16V3.333a2 2 0 00-2-2zm.667 2v2H1.333v-2a.667.667 0 01.667-.667h12a.667.667 0 01.667.667zM1.333 14.667V6.667h13.334v8H1.333z" fill="currentColor"/>
        <path d="M11.333 8.667H10v1.333h1.333V8.667zM8.667 8.667H7.333v1.333h1.334V8.667zM6 8.667H4.667v1.333H6V8.667zM11.333 11.333H10v1.334h1.333v-1.334zM8.667 11.333H7.333v1.334h1.334v-1.334zM6 11.333H4.667v1.334H6v-1.334z" fill="currentColor"/>
      </g>
      <defs><clipPath id="ic-cal"><rect width="16" height="16" fill="white"/></clipPath></defs>
    </svg>
  )
}

export function IconClock({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <g clipPath="url(#ic-clk)">
        <path d="M8.667 1.367V.667a.667.667 0 00-1.334 0v.7a6.667 6.667 0 00-4.88 12.084 1.333 1.333 0 00-1.12 1.882.667.667 0 001.334 0 .667.667 0 011.873-.82A6.667 6.667 0 0012.467 14.474a.667.667 0 011.866.86.667.667 0 001.334 0 1.333 1.333 0 00-1.12-1.882A6.667 6.667 0 008.667 1.367zM2 8.667a6 6 0 1112 0 6 6 0 01-12 0z" fill="currentColor"/>
        <path d="M12.81 0a.667.667 0 000 1.333 1.333 1.333 0 011.857 1.667.667.667 0 001.333 0A2.667 2.667 0 0012.81 0zM1.333 3a1.333 1.333 0 011.857-1.667.667.667 0 100-1.333A2.667 2.667 0 000 3a.667.667 0 001.333 0z" fill="currentColor"/>
        <path d="M8.667 7.724V4.667a.667.667 0 00-1.334 0V8c0 .177.07.346.196.471l2 2a.667.667 0 10.942-.943L8.667 7.724z" fill="currentColor"/>
      </g>
      <defs><clipPath id="ic-clk"><rect width="16" height="16" fill="white"/></clipPath></defs>
    </svg>
  )
}

export function IconLocation({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <g clipPath="url(#ic-loc)">
        <path d="M7.972 16.005l-.465-.398C6.867 15.07 1.273 10.24 1.273 6.705a6.699 6.699 0 1113.398 0c0 3.534-5.594 8.365-6.232 8.904l-.467.396zM7.972 1.455a5.25 5.25 0 00-5.251 5.25c0 2.22 3.442 5.767 5.251 7.39 1.809-1.624 5.25-5.168 5.25-7.39a5.25 5.25 0 00-5.25-5.25z" fill="currentColor"/>
        <path d="M7.972 9.36a2.656 2.656 0 110-5.311 2.656 2.656 0 010 5.312zm0-3.983a1.328 1.328 0 100 2.656 1.328 1.328 0 000-2.656z" fill="currentColor"/>
      </g>
      <defs><clipPath id="ic-loc"><rect width="16" height="16" fill="white"/></clipPath></defs>
    </svg>
  )
}

export function IconMap({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g clipPath="url(#ic-map)">
        <path d="M12 12a4 4 0 10-.001-8.001A4 4 0 0012 12zm0-6a2 2 0 110 4 2 2 0 010-4zm4 16.03l8 1.948V13.483a3.333 3.333 0 00-2.133-3.1l-2.1-.7A12.1 12.1 0 0020 8.006a8 8 0 00-16 0c.003.406.036.811.1 1.212a4.035 4.035 0 00-2.1 2.782A4 4 0 000 12v9.752L7.983 24.033 16 22.03zM7.757 3.764a6 6 0 018.493 8.477L12 16.4l-4.243-4.151a6 6 0 010-8.485zM2 12c0-.165.04-.327.117-.473a1.333 1.333 0 011.313-.527l1.434.518a9.432 9.432 0 001.487 2.056L12 19.2l5.657-5.533c.556-.555 1.028-1.19 1.4-1.882l2.217.741c.209.06.392.186.523.36.131.172.202.384.202.6v7.95l-5.999-1.466-7.98 2-6.02-1.724V12z" fill="currentColor"/>
      </g>
      <defs><clipPath id="ic-map"><rect width="24" height="24" fill="white"/></clipPath></defs>
    </svg>
  )
}

export function IconTicket({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M16 0h-.13a2.666 2.666 0 00-2.54 2.126 2.667 2.667 0 01-5.187 0A2.666 2.666 0 005.603.063 3 3 0 003 5v16a3 3 0 003 3h2.13a2.666 2.666 0 002.54-2.126 2.667 2.667 0 015.187 0 2.666 2.666 0 002.54 2.063H21a3 3 0 003-3V5a3 3 0 00-5-3.534A3 3 0 0016 0zm2 22l-2.143-.063A4.667 4.667 0 008.13 22H6a1 1 0 01-1-1v-4h2a1 1 0 100-2H5V5a3 3 0 016-3.063 4.667 4.667 0 007.727 0H16a3 3 0 013 3v10h-2a1 1 0 100 2h2v4a1 1 0 01-1 1z" fill="currentColor"/>
      <path d="M13 15h-2a1 1 0 100 2h2a1 1 0 100-2z" fill="currentColor"/>
    </svg>
  )
}
