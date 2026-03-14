import { useState, useMemo, useCallback } from 'react'
import { useWords } from '../hooks/useWords'
import { usePlaces } from '../hooks/usePlaces'
import { filterWords, extractAllTags } from '../lib/search'
import { SearchBar } from '../components/SearchBar'
import { TagFilterChips } from '../components/TagFilterChips'
import { PlaceFilterChips } from '../components/PlaceFilterChips'
import { WordList } from '../components/WordList'
import './SearchPage.css'

interface PlaceFilter {
  placeId: string
  state: 'used' | 'not_used' | 'unknown'
}

export function SearchPage() {
  const { words, loading, error } = useWords()
  const { places } = usePlaces()
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter | null>(null)

  const allTags = useMemo(() => extractAllTags(words), [words])

  const filtered = useMemo(
    () => filterWords(words, { query, tags: selectedTags, placeFilter }),
    [words, query, selectedTags, placeFilter],
  )

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Паўтарыць</button>
      </div>
    )
  }

  if (words.length === 0) {
    return <div className="empty-state">Слоўнік пакуль пусты</div>
  }

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} />
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggle={handleTagToggle}
      />
      <PlaceFilterChips
        places={places}
        filter={placeFilter}
        onChange={setPlaceFilter}
      />
      <WordList words={filtered} places={places} />
      <div className="word-count">{filtered.length} з {words.length} слоў</div>
    </div>
  )
}
