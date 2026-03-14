import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Place } from '../types'

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'places'), orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data()
          return {
            id: doc.id,
            name: d.name ?? '',
            lat: d.lat ?? null,
            lng: d.lng ?? null,
            region: d.region ?? '',
          } satisfies Place
        })
        setPlaces(data)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError('Не ўдалося загрузіць месцы')
        setLoading(false)
        console.error('Firestore places error:', err)
      },
    )
    return unsubscribe
  }, [])

  return { places, loading, error }
}
