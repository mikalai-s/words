import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Word, WordFormData } from '../types'

const wordsRef = collection(db, 'words')

export async function addWord(data: WordFormData): Promise<string> {
  const docRef = await addDoc(wordsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWord(id: string, data: WordFormData): Promise<void> {
  await updateDoc(doc(db, 'words', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWord(id: string): Promise<void> {
  await deleteDoc(doc(db, 'words', id))
}

export async function getWord(id: string): Promise<Word | null> {
  const snap = await getDoc(doc(db, 'words', id))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    id: snap.id,
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
  }
}
