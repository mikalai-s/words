import type { Word, Place } from '../types'
import { WordCard } from './WordCard'

interface Props {
  words: Word[]
  places: Place[]
}

export function WordList({ words, places }: Props) {
  if (words.length === 0) {
    return <p className="empty-state">Нічога не знойдзена</p>
  }

  return (
    <div>
      {words.map((word) => (
        <WordCard key={word.id} word={word} places={places} />
      ))}
    </div>
  )
}
