import { useParams, Link } from 'react-router-dom'
import { useWords } from '../hooks/useWords'
import { usePlaces } from '../hooks/usePlaces'
import { useAuth } from '../contexts/AuthContext'
import { PlaceBadge } from '../components/PlaceBadge'
import { TagBadge } from '../components/TagBadge'
import { RelatedWordLink } from '../components/RelatedWordLink'
import './WordDetailPage.css'

export function WordDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { words, loading } = useWords()
  const { places } = usePlaces()
  const { isAdmin } = useAuth()

  if (loading) return <div className="loading">Загрузка...</div>

  const word = words.find((w) => w.id === id)
  if (!word) return <div className="empty-state">Слова не знойдзена</div>

  return (
    <div className="word-detail">
      <Link to="/" className="back-link">← назад</Link>

      <h1 className="word-detail-word">{word.word}</h1>
      {word.partOfSpeech && (
        <span className="word-detail-pos">{word.partOfSpeech}</span>
      )}

      <section className="detail-section">
        <h2 className="detail-label">Значэнне</h2>
        <p>{word.meaning}</p>
      </section>

      {word.examples.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-label">Прыклады</h2>
          {word.examples.map((ex, i) => (
            <blockquote key={i} className="example-quote">"{ex}"</blockquote>
          ))}
        </section>
      )}

      {Object.keys(word.placeUsage).length > 0 && (
        <section className="detail-section">
          <h2 className="detail-label">Месцы</h2>
          <div className="badge-list">
            {Object.entries(word.placeUsage).map(([placeId, state]) => {
              const place = places.find((p) => p.id === placeId)
              if (!place) return null
              return <PlaceBadge key={placeId} name={place.name} state={state} />
            })}
          </div>
        </section>
      )}

      {word.tags.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-label">Тэгі</h2>
          <div className="badge-list">
            {word.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </section>
      )}

      {word.source && (
        <section className="detail-section">
          <h2 className="detail-label">Крыніца</h2>
          <p>{word.source}</p>
        </section>
      )}

      {word.relatedWords.length > 0 && (
        <section className="detail-section">
          <h2 className="detail-label">Звязаныя словы</h2>
          <div className="badge-list">
            {word.relatedWords.map((wId) => (
              <RelatedWordLink key={wId} wordId={wId} allWords={words} />
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <div className="detail-admin">
          <Link to={`/word/${word.id}/edit`} className="edit-button">
            ✏️ Рэдагаваць
          </Link>
        </div>
      )}
    </div>
  )
}
