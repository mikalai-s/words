import './badges.css'

interface Props {
  name: string
  state: 'used' | 'not_used' | 'unknown'
}

export function PlaceBadge({ name, state }: Props) {
  const prefix = state === 'used' ? '✓' : state === 'not_used' ? '✗' : '?'
  return (
    <span className={`place-badge place-badge--${state.replace('_', '-')}`}>
      {prefix} {name}
    </span>
  )
}
