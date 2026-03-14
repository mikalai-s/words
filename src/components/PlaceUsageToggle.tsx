import type { PlaceUsageState } from '../types'
import './PlaceUsageToggle.css'

interface Props {
  name: string
  state: PlaceUsageState | undefined
  onChange: (state: PlaceUsageState | undefined) => void
}

const nextState: Record<string, PlaceUsageState | undefined> = {
  undefined: 'used',
  used: 'not_used',
  not_used: undefined,
}

const stateDisplay: Record<string, { icon: string; label: string; className: string }> = {
  undefined: { icon: '?', label: 'невядома', className: 'toggle--unknown' },
  used: { icon: '✓', label: 'выкарыстоўваецца', className: 'toggle--used' },
  not_used: { icon: '✗', label: 'не выкарыстоўваецца', className: 'toggle--not-used' },
}

export function PlaceUsageToggle({ name, state, onChange }: Props) {
  const key = String(state)
  const display = stateDisplay[key]
  const next = nextState[key]

  return (
    <button
      type="button"
      className={`place-usage-toggle ${display.className}`}
      onClick={() => onChange(next)}
    >
      <span className="toggle-icon">{display.icon}</span>
      <span className="toggle-name">{name}</span>
      <span className="toggle-label">{display.label}</span>
    </button>
  )
}
