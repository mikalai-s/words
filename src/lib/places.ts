import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const placesRef = collection(db, 'places')

export async function addPlace(data: {
  name: string
  lat: number | null
  lng: number | null
  region: string
}): Promise<string> {
  const docRef = await addDoc(placesRef, data)
  return docRef.id
}

export async function updatePlace(
  id: string,
  data: { name: string; lat: number | null; lng: number | null; region: string },
): Promise<void> {
  await updateDoc(doc(db, 'places', id), data)
}

export async function deletePlace(id: string): Promise<void> {
  await deleteDoc(doc(db, 'places', id))
}
