import { describe, it, expect } from 'vitest'
import { filterWords } from '../search'
import type { Word } from '../../types'

const makeWord = (overrides: Partial<Word> = {}): Word => ({
  id: '1',
  word: 'бульба',
  meaning: 'картошка',
  placeUsage: { place1: 'used', place2: 'not_used' },
  examples: ['Трэба бульбу капаць'],
  partOfSpeech: 'назоўнік',
  relatedWords: [],
  source: 'Мама',
  tags: ['ежа'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('filterWords', () => {
  const words: Word[] = [
    makeWord({ id: '1', word: 'бульба', meaning: 'картошка', tags: ['ежа'], placeUsage: { p1: 'used', p2: 'not_used' } }),
    makeWord({ id: '2', word: 'гарбуз', meaning: 'тыква', tags: ['ежа', 'гаспадарка'], placeUsage: { p1: 'used' } }),
    makeWord({ id: '3', word: 'хата', meaning: 'дом', tags: ['гаспадарка'], placeUsage: { p2: 'used' } }),
  ]

  describe('text search', () => {
    it('finds by word substring (case-insensitive)', () => {
      const result = filterWords(words, { query: 'бульб' })
      expect(result.map((w) => w.id)).toEqual(['1'])
    })
    it('finds by meaning substring', () => {
      const result = filterWords(words, { query: 'тыкв' })
      expect(result.map((w) => w.id)).toEqual(['2'])
    })
    it('returns all when query is empty', () => {
      const result = filterWords(words, { query: '' })
      expect(result).toHaveLength(3)
    })
    it('is case-insensitive for Cyrillic', () => {
      const result = filterWords(words, { query: 'БУЛЬБА' })
      expect(result.map((w) => w.id)).toEqual(['1'])
    })
  })

  describe('tag filter', () => {
    it('filters by single tag (OR logic)', () => {
      const result = filterWords(words, { query: '', tags: ['гаспадарка'] })
      expect(result.map((w) => w.id)).toEqual(['2', '3'])
    })
    it('filters by multiple tags (OR logic)', () => {
      const result = filterWords(words, { query: '', tags: ['ежа', 'гаспадарка'] })
      expect(result).toHaveLength(3)
    })
    it('returns all when no tags selected', () => {
      const result = filterWords(words, { query: '', tags: [] })
      expect(result).toHaveLength(3)
    })
  })

  describe('place filter', () => {
    it('filters words used in a place', () => {
      const result = filterWords(words, { query: '', placeFilter: { placeId: 'p1', state: 'used' } })
      expect(result.map((w) => w.id)).toEqual(['1', '2'])
    })
    it('filters words not used in a place', () => {
      const result = filterWords(words, { query: '', placeFilter: { placeId: 'p2', state: 'not_used' } })
      expect(result.map((w) => w.id)).toEqual(['1'])
    })
    it('filters words with unknown usage for a place', () => {
      const result = filterWords(words, { query: '', placeFilter: { placeId: 'p2', state: 'unknown' } })
      expect(result.map((w) => w.id)).toEqual(['2'])
    })
  })

  describe('combined filters', () => {
    it('AND-combines text + tag + place', () => {
      const result = filterWords(words, {
        query: '',
        tags: ['ежа'],
        placeFilter: { placeId: 'p1', state: 'used' },
      })
      expect(result.map((w) => w.id)).toEqual(['1', '2'])
    })
  })
})
