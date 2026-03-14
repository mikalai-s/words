import { Link } from 'react-router-dom'
import type { Word } from '../types'

interface Props {
  wordId: string
  allWords: Word[]
}

export function RelatedWordLink({ wordId, allWords }: Props) {
  const related = allWords.find((w) => w.id === wordId)
  if (!related) return null
  return (
    <Link
      to={`/word/${wordId}`}
      style={{
        display: 'inline-block',
        background: 'var(--accent-bg)',
        color: 'var(--accent)',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '14px',
        textDecoration: 'none',
      }}
    >
      {related.word} →
    </Link>
  )
}
