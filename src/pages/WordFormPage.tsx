import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useWords } from '../hooks/useWords'
import { usePlaces } from '../hooks/usePlaces'
import { useAuth } from '../contexts/AuthContext'
import { addWord, updateWord } from '../lib/words'
import { extractAllTags, extractAllSources } from '../lib/search'
import { PlaceUsageToggle } from '../components/PlaceUsageToggle'
import { PARTS_OF_SPEECH } from '../types'
import type { WordFormData, PlaceUsageState } from '../types'
import './WordFormPage.css'

export function WordFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { words, loading } = useWords()
  const { places } = usePlaces()
  const isEdit = Boolean(id)

  const existingWord = isEdit ? words.find((w) => w.id === id) : null
  const allTags = useMemo(() => extractAllTags(words), [words])
  const allSources = useMemo(() => extractAllSources(words), [words])

  const [form, setForm] = useState<WordFormData>({
    word: '',
    meaning: '',
    placeUsage: {},
    examples: [''],
    partOfSpeech: '',
    relatedWords: [],
    source: '',
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [relatedSearch, setRelatedSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingWord) {
      setForm({
        word: existingWord.word,
        meaning: existingWord.meaning,
        placeUsage: { ...existingWord.placeUsage },
        examples: existingWord.examples.length > 0 ? [...existingWord.examples] : [''],
        partOfSpeech: existingWord.partOfSpeech,
        relatedWords: [...existingWord.relatedWords],
        source: existingWord.source,
        tags: [...existingWord.tags],
      })
      setTagInput(existingWord.tags.join(', '))
    }
  }, [existingWord])

  if (!isAdmin) {
    navigate('/')
    return null
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (isEdit && !existingWord) return <div className="empty-state">Слова не знойдзена</div>

  const handlePlaceToggle = (placeId: string, state: PlaceUsageState | undefined) => {
    setForm((prev) => {
      const next = { ...prev.placeUsage }
      if (state === undefined) {
        delete next[placeId]
      } else {
        next[placeId] = state
      }
      return { ...prev, placeUsage: next }
    })
  }

  const handleExampleChange = (index: number, value: string) => {
    setForm((prev) => {
      const examples = [...prev.examples]
      examples[index] = value
      return { ...prev, examples }
    })
  }

  const addExample = () => setForm((prev) => ({ ...prev, examples: [...prev.examples, ''] }))

  const removeExample = (index: number) => {
    setForm((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index),
    }))
  }

  const handleTagInputBlur = () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    setForm((prev) => ({ ...prev, tags }))
  }

  const relatedCandidates = relatedSearch
    ? words
        .filter((w) => w.id !== id && !form.relatedWords.includes(w.id))
        .filter((w) => w.word.toLowerCase().includes(relatedSearch.toLowerCase()))
        .slice(0, 5)
    : []

  const addRelated = (wordId: string) => {
    setForm((prev) => ({ ...prev, relatedWords: [...prev.relatedWords, wordId] }))
    setRelatedSearch('')
  }

  const removeRelated = (wordId: string) => {
    setForm((prev) => ({
      ...prev,
      relatedWords: prev.relatedWords.filter((id) => id !== wordId),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.word.trim() || !form.meaning.trim()) {
      setError('Слова і значэнне абавязковыя')
      return
    }

    const data: WordFormData = {
      ...form,
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      examples: form.examples.filter((e) => e.trim()),
      tags: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
      source: form.source.trim(),
    }

    setSaving(true)
    setError(null)
    try {
      if (isEdit && id) {
        await updateWord(id, data)
        navigate(`/word/${id}`)
      } else {
        const newId = await addWord(data)
        navigate(`/word/${newId}`)
      }
    } catch {
      setError('Не ўдалося захаваць')
      setSaving(false)
    }
  }

  return (
    <form className="word-form" onSubmit={handleSubmit}>
      <Link to={isEdit ? `/word/${id}` : '/'} className="back-link">← назад</Link>
      <h1>{isEdit ? 'Рэдагаваць слова' : 'Дадаць слова'}</h1>

      {error && <div className="form-error">{error}</div>}

      <label className="form-field">
        <span className="form-label">Слова *</span>
        <input
          type="text"
          value={form.word}
          onChange={(e) => setForm((p) => ({ ...p, word: e.target.value }))}
          className="form-input"
          autoFocus
        />
      </label>

      <label className="form-field">
        <span className="form-label">Значэнне *</span>
        <input
          type="text"
          value={form.meaning}
          onChange={(e) => setForm((p) => ({ ...p, meaning: e.target.value }))}
          className="form-input"
        />
      </label>

      <label className="form-field">
        <span className="form-label">Часціна мовы</span>
        <select
          value={form.partOfSpeech}
          onChange={(e) => setForm((p) => ({ ...p, partOfSpeech: e.target.value }))}
          className="form-input"
        >
          <option value="">—</option>
          {PARTS_OF_SPEECH.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </label>

      <div className="form-field">
        <span className="form-label">Месцы</span>
        <div className="places-list">
          {places.map((place) => (
            <PlaceUsageToggle
              key={place.id}
              name={place.name}
              state={form.placeUsage[place.id]}
              onChange={(state) => handlePlaceToggle(place.id, state)}
            />
          ))}
        </div>
      </div>

      <div className="form-field">
        <span className="form-label">Прыклады выкарыстання</span>
        {form.examples.map((ex, i) => (
          <div key={i} className="example-row">
            <input
              type="text"
              value={ex}
              onChange={(e) => handleExampleChange(i, e.target.value)}
              className="form-input"
              placeholder="Прыклад..."
            />
            {form.examples.length > 1 && (
              <button type="button" className="remove-btn" onClick={() => removeExample(i)}>×</button>
            )}
          </div>
        ))}
        <button type="button" className="add-btn" onClick={addExample}>+ Дадаць прыклад</button>
      </div>

      <label className="form-field">
        <span className="form-label">Крыніца</span>
        <input
          type="text"
          value={form.source}
          onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
          className="form-input"
          list="sources-list"
          placeholder="Мама, Тата..."
        />
        <datalist id="sources-list">
          {allSources.map((s) => <option key={s} value={s} />)}
        </datalist>
      </label>

      <label className="form-field">
        <span className="form-label">Тэгі</span>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onBlur={handleTagInputBlur}
          className="form-input"
          list="tags-list"
          placeholder="ежа, гаспадарка..."
        />
        <datalist id="tags-list">
          {allTags.map((t) => <option key={t} value={t} />)}
        </datalist>
      </label>

      <div className="form-field">
        <span className="form-label">Звязаныя словы</span>
        <input
          type="text"
          value={relatedSearch}
          onChange={(e) => setRelatedSearch(e.target.value)}
          className="form-input"
          placeholder="Шукаць слова..."
        />
        {relatedCandidates.length > 0 && (
          <div className="autocomplete-list">
            {relatedCandidates.map((w) => (
              <button key={w.id} type="button" className="autocomplete-item" onClick={() => addRelated(w.id)}>
                {w.word} — {w.meaning}
              </button>
            ))}
          </div>
        )}
        {form.relatedWords.length > 0 && (
          <div className="related-chips">
            {form.relatedWords.map((wId) => {
              const w = words.find((w) => w.id === wId)
              return (
                <span key={wId} className="related-chip">
                  {w?.word ?? wId}
                  <button type="button" onClick={() => removeRelated(wId)}>×</button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <button type="submit" className="submit-btn" disabled={saving}>
        {saving ? 'Захоўванне...' : 'Захаваць'}
      </button>
    </form>
  )
}
