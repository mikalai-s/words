import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Word } from '../types'

export function useWords() {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'words'), orderBy('word'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            word: d.word ?? '',
            meaning: d.meaning ?? '',
            placeUsage: d.placeUsage ?? {},
            examples: d.examples ?? [],
            partOfSpeech: d.partOfSpeech ?? '',
            relatedWords: d.relatedWords ?? [],
            source: d.source ?? '',
            tags: d.tags ?? [],
            createdAt: d.createdAt?.toDate() ?? new Date(),
            updatedAt: d.updatedAt?.toDate() ?? new Date(),
          } satisfies Word
        })
        setWords(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError('Не ўдалося загрузіць дадзеныя')
        setLoading(false)
        console.error('Firestore words error:', err)
      },
    )
    return unsubscribe
  }, [])

  return { words, loading, error }
}
