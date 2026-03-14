import './badges.css'

interface Props {
  tag: string
  onClick?: () => void
  active?: boolean
}

export function TagBadge({ tag, onClick, active }: Props) {
  const style = active
    ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
    : undefined

  if (onClick) {
    return (
      <button className="tag-badge" style={style} onClick={onClick}>
        {tag}
      </button>
    )
  }
  return <span className="tag-badge">{tag}</span>
}
