import type { Place } from '../types'
import './FilterChips.css'

type PlaceFilterState = 'used' | 'not_used' | 'unknown'

interface PlaceFilter {
  placeId: string
  state: PlaceFilterState
}

interface Props {
  places: Place[]
  filter: PlaceFilter | null
  onChange: (filter: PlaceFilter | null) => void
}

const stateLabels: Record<PlaceFilterState, string> = {
  used: '✓',
  not_used: '✗',
  unknown: '?',
}

export function PlaceFilterChips({ places, filter, onChange }: Props) {
  if (places.length === 0) return null

  return (
    <div className="place-filter">
      <select
        value={filter?.placeId ?? ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange({ placeId: e.target.value, state: filter?.state ?? 'used' })
          } else {
            onChange(null)
          }
        }}
      >
        <option value="">📍 Фільтр па месцы</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {filter && (
        <div className="place-filter-states">
          {(Object.keys(stateLabels) as PlaceFilterState[]).map((state) => (
            <button
              key={state}
              className={`place-state-btn ${filter.state === state ? `place-state-btn--active-${state}` : ''}`}
              onClick={() => onChange({ ...filter, state })}
            >
              {stateLabels[state]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
