export type PlaceUsageState = 'used' | 'not_used'

export type PlaceUsageMap = Record<string, PlaceUsageState>

export interface Word {
  id: string
  word: string
  meaning: string
  placeUsage: PlaceUsageMap
  examples: string[]
  partOfSpeech: string
  relatedWords: string[]
  source: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Place {
  id: string
  name: string
  lat: number | null
  lng: number | null
  region: string
}

export interface WordFormData {
  word: string
  meaning: string
  placeUsage: PlaceUsageMap
  examples: string[]
  partOfSpeech: string
  relatedWords: string[]
  source: string
  tags: string[]
}

export const PARTS_OF_SPEECH = [
  'назоўнік',
  'дзеяслоў',
  'прыметнік',
  'прыслоўе',
  'займеннік',
  'лічэбнік',
  'прыназоўнік',
  'злучнік',
  'часціца',
  'выклічнік',
] as const
