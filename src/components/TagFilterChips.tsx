import './FilterChips.css'

interface Props {
  allTags: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

export function TagFilterChips({ allTags, selectedTags, onToggle }: Props) {
  if (allTags.length === 0) return null

  return (
    <div className="filter-chips">
      {allTags.map((tag) => (
        <button
          key={tag}
          className={`filter-chip ${selectedTags.includes(tag) ? 'filter-chip--active' : ''}`}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
