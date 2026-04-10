import './FloorSelector.css'

export default function FloorSelector({ floors, value, onChange }) {
  if (!floors || floors.length < 2) return null
  return (
    <div className="floor-selector" role="group" aria-label="Selector de piso">
      {floors.map((f) => (
        <button
          key={f}
          type="button"
          className={'floor-selector__btn' + (f === value ? ' is-active' : '')}
          onClick={() => onChange(f)}
          aria-pressed={f === value}
        >
          {f}
        </button>
      ))}
    </div>
  )
}
