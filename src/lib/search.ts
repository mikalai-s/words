import type { Word } from '../types'

export interface SearchFilters {
  query?: string
  tags?: string[]
  placeFilter?: {
    placeId: string
    state: 'used' | 'not_used' | 'unknown'
  } | null
}

const beCollator = new Intl.Collator('be')

export function filterWords(words: Word[], filters: SearchFilters): Word[] {
  const { query = '', tags = [], placeFilter = null } = filters
  const lowerQuery = query.toLowerCase()

  return words.filter((word) => {
    if (lowerQuery) {
      const matchesWord = word.word.toLowerCase().includes(lowerQuery)
      const matchesMeaning = word.meaning.toLowerCase().includes(lowerQuery)
      if (!matchesWord && !matchesMeaning) return false
    }
    if (tags.length > 0) {
      const hasMatchingTag = tags.some((tag) => word.tags.includes(tag))
      if (!hasMatchingTag) return false
    }
    if (placeFilter) {
      const usage = word.placeUsage[placeFilter.placeId]
      if (placeFilter.state === 'unknown') {
        if (usage !== undefined) return false
      } else {
        if (usage !== placeFilter.state) return false
      }
    }
    return true
  }).sort((a, b) => beCollator.compare(a.word, b.word))
}

export function extractAllTags(words: Word[]): string[] {
  const tagSet = new Set<string>()
  for (const word of words) {
    for (const tag of word.tags) {
      tagSet.add(tag)
    }
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'be'))
}

export function extractAllSources(words: Word[]): string[] {
  const sourceSet = new Set<string>()
  for (const word of words) {
    if (word.source) sourceSet.add(word.source)
  }
  return Array.from(sourceSet).sort((a, b) => a.localeCompare(b, 'be'))
}
