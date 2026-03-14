import { Link } from 'react-router-dom'
import type { Word, Place } from '../types'
import './WordCard.css'

interface Props {
  word: Word
  places: Place[]
}

export function WordCard({ word, places }: Props) {
  const placeNames = Object.entries(word.placeUsage)
    .filter(([, state]) => state === 'used')
    .map(([placeId]) => places.find((p) => p.id === placeId)?.name)
    .filter(Boolean)

  return (
    <Link to={`/word/${word.id}`} className="word-card">
      <div className="word-card-header">
        <span className="word-card-word">{word.word}</span>
        {word.partOfSpeech && (
          <span className="word-card-pos">{word.partOfSpeech}</span>
        )}
      </div>
      <div className="word-card-meaning">{word.meaning}</div>
      {(placeNames.length > 0 || word.tags.length > 0) && (
        <div className="word-card-meta">
          {placeNames.map((name) => (
            <span key={name} className="word-card-place">📍 {name}</span>
          ))}
          {word.tags.map((tag) => (
            <span key={tag} className="word-card-tag">{tag}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
