# Dialect Dictionary Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a searchable Belarusian dialect word dictionary with public browse/search and admin-only editing.

**Architecture:** React 19 + TypeScript + Vite SPA deployed to GitHub Pages. Firebase Firestore for persistence with Anonymous Auth for admin access via secret URL hash. All search/filtering is client-side on the full dataset loaded via real-time `onSnapshot`.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Firebase 11 (Firestore + Auth), react-router-dom 7, vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-14-dialect-dictionary-design.md`

---

## Chunk 1: Project Scaffolding, Types, Firebase Config

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `.gitignore`, `.env.example`
- Create: `public/CNAME`

- [ ] **Step 1: Initialize the Vite project**

Run:
```bash
cd /Users/msilivonik/GitHub/mikalai-s
npm create vite@latest . -- --template react-ts
```

If prompted about non-empty directory, proceed (only .git and docs exist).

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install firebase react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Create `.env.example`**

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 4: Create `public/CNAME`**

```
words.ms7k.com
```

- [ ] **Step 5: Update `.gitignore`**

Append to the generated `.gitignore`:
```
.env.local
.superpowers/
```

- [ ] **Step 6: Configure Vite for GitHub Pages SPA**

Replace `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

- [ ] **Step 7: Create test setup file**

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Create SPA 404 redirect for GitHub Pages**

Create `public/404.html`:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Слоўнік</title>
    <script>
      // Single Page Apps for GitHub Pages
      // https://github.com/rafgraph/spa-github-pages
      var pathSegmentsToKeep = 0;
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body></body>
</html>
```

- [ ] **Step 9: Add SPA redirect script to `index.html`**

Add this script inside `<head>` of `index.html`, before other scripts:
```html
    <script>
      // Single Page Apps for GitHub Pages redirect handler
      (function(l) {
        if (l.search[1] === '/') {
          var decoded = l.search.slice(1).split('&').map(function(s) {
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(null, null,
            l.pathname.slice(0, -1) + decoded + l.hash
          );
        }
      }(window.location))
    </script>
```

- [ ] **Step 10: Verify project builds**

Run:
```bash
npm run build
```
Expected: Clean build, `dist/` folder created with `CNAME` and `404.html` present.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project with GitHub Pages SPA support"
```

---

### Task 2: Define TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create type definitions**

Create `src/types/index.ts`:
```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for Word, Place, and PlaceUsageMap"
```

---

### Task 3: Firebase configuration module

**Files:**
- Create: `src/config/firebase.ts`

- [ ] **Step 1: Create Firebase initialization**

Create `src/config/firebase.ts`:
```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080)
  connectAuthEmulator(auth, 'http://localhost:9099')
}
```

- [ ] **Step 2: Create Firestore security rules file (for reference)**

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /config/{doc} { allow read, write: if false; }

    match /admins/{uid} {
      allow read: if false;
      allow create: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.secret
           == get(/databases/$(database)/documents/config/admin).data.secret;
      allow update, delete: if false;
    }

    match /words/{wordId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /places/{placeId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }
  }
}
```

- [ ] **Step 3: Verify build still succeeds**

Run:
```bash
npm run build
```
Expected: Clean build (Firebase imports tree-shaken properly).

- [ ] **Step 4: Commit**

```bash
git add src/config/firebase.ts firestore.rules
git commit -m "feat: add Firebase config and Firestore security rules"
```

---

## Chunk 2: Auth System and Data Layer

### Task 4: Auth — hash parsing utility and tests

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { extractAdminSecret } from '../auth'

describe('extractAdminSecret', () => {
  it('extracts secret from hash with admin= prefix', () => {
    expect(extractAdminSecret('#admin=my-secret-123')).toBe('my-secret-123')
  })

  it('returns null when hash has no admin param', () => {
    expect(extractAdminSecret('#other=value')).toBeNull()
  })

  it('returns null for empty hash', () => {
    expect(extractAdminSecret('')).toBeNull()
  })

  it('returns null for hash with only #', () => {
    expect(extractAdminSecret('#')).toBeNull()
  })

  it('handles secret with special characters', () => {
    expect(extractAdminSecret('#admin=a-b_c.d!e')).toBe('a-b_c.d!e')
  })

  it('extracts secret when other hash params present', () => {
    expect(extractAdminSecret('#foo=bar&admin=secret&baz=qux')).toBe('secret')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/__tests__/auth.test.ts
```
Expected: FAIL — `extractAdminSecret` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/auth.ts`:
```typescript
export function extractAdminSecret(hash: string): string | null {
  if (!hash || hash === '#') return null
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(withoutHash)
  return params.get('admin')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/__tests__/auth.test.ts
```
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/__tests__/auth.test.ts
git commit -m "feat: add hash parsing utility for admin secret extraction"
```

---

### Task 5: Auth — context, hook, and guard

**Files:**
- Create: `src/contexts/AuthContext.tsx` (includes `useAuth` hook export)
- Create: `src/components/AdminGuard.tsx`

- [ ] **Step 1: Create AuthContext**

Create `src/contexts/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { extractAdminSecret } from '../lib/auth'

interface AuthState {
  isAdmin: boolean
  loading: boolean
  error: string | null
}

const AuthContext = createContext<AuthState>({
  isAdmin: false,
  loading: true,
  error: null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAdmin: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    // Extract secret from hash on mount
    const secret =
      extractAdminSecret(window.location.hash) ??
      sessionStorage.getItem('admin_secret')

    if (secret) {
      // Clean hash from URL
      if (window.location.hash.includes('admin=')) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      sessionStorage.setItem('admin_secret', secret)
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!secret) {
        setState({ isAdmin: false, loading: false, error: null })
        return
      }

      try {
        const currentUser = user ?? (await signInAnonymously(auth)).user
        await setDoc(doc(db, 'admins', currentUser.uid), { secret })
        setState({ isAdmin: true, loading: false, error: null })
      } catch {
        sessionStorage.removeItem('admin_secret')
        setState({
          isAdmin: false,
          loading: false,
          error: 'Не ўдалося ўвайсці як адмін',
        })
      }
    })

    return unsubscribe
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Create AdminGuard component**

Create `src/components/AdminGuard.tsx`:
```typescript
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return <>{children}</>
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npm run build
```
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/contexts/AuthContext.tsx src/components/AdminGuard.tsx
git commit -m "feat: add auth context with anonymous auth and AdminGuard component"
```

---

### Task 6: Data layer — Firestore CRUD and hooks

**Files:**
- Create: `src/lib/words.ts`
- Create: `src/lib/places.ts`
- Create: `src/hooks/useWords.ts`
- Create: `src/hooks/usePlaces.ts`

- [ ] **Step 1: Create words CRUD**

Create `src/lib/words.ts`:
```typescript
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
```

- [ ] **Step 2: Create places CRUD**

Create `src/lib/places.ts`:
```typescript
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
```

- [ ] **Step 3: Create useWords hook**

Create `src/hooks/useWords.ts`:
```typescript
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
```

- [ ] **Step 4: Create usePlaces hook**

Create `src/hooks/usePlaces.ts`:
```typescript
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
```

- [ ] **Step 5: Verify build**

Run:
```bash
npm run build
```
Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add src/lib/words.ts src/lib/places.ts src/hooks/useWords.ts src/hooks/usePlaces.ts
git commit -m "feat: add Firestore CRUD operations and real-time subscription hooks"
```

---

## Chunk 3: Search Logic, Theming, Layout, Routing

### Task 7: Search and filter logic with tests

**Files:**
- Create: `src/lib/search.ts`
- Create: `src/lib/__tests__/search.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/search.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/__tests__/search.test.ts
```
Expected: FAIL — `filterWords` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/search.ts`:
```typescript
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
    // Text search
    if (lowerQuery) {
      const matchesWord = word.word.toLowerCase().includes(lowerQuery)
      const matchesMeaning = word.meaning.toLowerCase().includes(lowerQuery)
      if (!matchesWord && !matchesMeaning) return false
    }

    // Tag filter (OR logic)
    if (tags.length > 0) {
      const hasMatchingTag = tags.some((tag) => word.tags.includes(tag))
      if (!hasMatchingTag) return false
    }

    // Place filter
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/__tests__/search.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search.ts src/lib/__tests__/search.test.ts
git commit -m "feat: add client-side search and filter logic with tests"
```

---

### Task 8: Theming (auto light/dark)

**Files:**
- Create: `src/hooks/useTheme.ts`
- Modify: `src/index.css` (replace entirely)

- [ ] **Step 1: Create theme hook**

Create `src/hooks/useTheme.ts`:
```typescript
import { useEffect } from 'react'

export function useTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    function apply(dark: boolean) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }

    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
}
```

- [ ] **Step 2: Create global styles with CSS custom properties**

Replace `src/index.css`:
```css
:root,
[data-theme='light'] {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --accent: #2563eb;
  --accent-bg: #dbeafe;
  --success: #16a34a;
  --success-bg: #dcfce7;
  --danger: #dc2626;
  --danger-bg: #fee2e2;
  --warning: #d97706;
  --warning-bg: #fef3c7;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --border: #334155;
  --accent: #60a5fa;
  --accent-bg: rgba(96, 165, 250, 0.15);
  --success: #22c55e;
  --success-bg: rgba(34, 197, 94, 0.15);
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.15);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.15);
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input,
select,
textarea {
  font-family: inherit;
  font-size: inherit;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.ts src/index.css
git commit -m "feat: add auto light/dark theming with CSS custom properties"
```

---

### Task 9: Layout and routing

**Files:**
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx` (replace entirely)
- Create: `src/pages/SearchPage.tsx` (placeholder)
- Create: `src/pages/WordDetailPage.tsx` (placeholder)
- Create: `src/pages/WordFormPage.tsx` (placeholder)
- Create: `src/pages/PlacesAdminPage.tsx` (placeholder)

- [ ] **Step 1: Create Layout component**

Create `src/components/Layout.tsx`:
```typescript
import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

export function Layout() {
  const { isAdmin, error } = useAuth()

  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="header-title">
          <span className="header-icon">📖</span>
          <span>Слоўнік</span>
        </Link>
        <nav className="header-nav">
          {isAdmin && (
            <>
              <Link to="/word/new" className="nav-link">+ Дадаць</Link>
              <Link to="/admin/places" className="nav-link">Месцы</Link>
            </>
          )}
          {isAdmin && <span className="admin-badge">адмін</span>}
        </nav>
      </header>
      {error && <div className="toast-error">{error}</div>}
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create Layout CSS**

Create `src/components/Layout.css`:
```css
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  text-decoration: none;
}

.header-icon {
  font-size: 24px;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-link {
  font-size: 14px;
  color: var(--accent);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
}

.nav-link:hover {
  background: var(--accent-bg);
  text-decoration: none;
}

.admin-badge {
  font-size: 11px;
  background: var(--success-bg);
  color: var(--success);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.toast-error {
  background: var(--danger-bg);
  color: var(--danger);
  padding: 8px 16px;
  text-align: center;
  font-size: 14px;
}

.main {
  flex: 1;
  padding: 16px;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}
```

- [ ] **Step 3: Create placeholder pages**

Create `src/pages/SearchPage.tsx`:
```typescript
export function SearchPage() {
  return <div>Search page — coming soon</div>
}
```

Create `src/pages/WordDetailPage.tsx`:
```typescript
export function WordDetailPage() {
  return <div>Word detail — coming soon</div>
}
```

Create `src/pages/WordFormPage.tsx`:
```typescript
export function WordFormPage() {
  return <div>Word form — coming soon</div>
}
```

Create `src/pages/PlacesAdminPage.tsx`:
```typescript
export function PlacesAdminPage() {
  return <div>Places admin — coming soon</div>
}
```

- [ ] **Step 4: Wire up App.tsx with router**

Replace `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useTheme } from './hooks/useTheme'
import { Layout } from './components/Layout'
import { SearchPage } from './pages/SearchPage'
import { WordDetailPage } from './pages/WordDetailPage'
import { WordFormPage } from './pages/WordFormPage'
import { PlacesAdminPage } from './pages/PlacesAdminPage'

export default function App() {
  useTheme()
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<SearchPage />} />
            <Route path="/word/new" element={<WordFormPage />} />
            <Route path="/word/:id" element={<WordDetailPage />} />
            <Route path="/word/:id/edit" element={<WordFormPage />} />
            <Route path="/admin/places" element={<PlacesAdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Update main.tsx**

Replace `src/main.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Verify build and dev server**

Run:
```bash
npm run build
```
Expected: Clean build. Then optionally `npm run dev` to see the skeleton in browser.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx src/components/Layout.tsx src/components/Layout.css src/pages/
git commit -m "feat: add layout, routing, and placeholder pages"
```

---

## Chunk 4: Search/Browse Page

### Task 10: Shared UI components (badges, search bar)

**Files:**
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/SearchBar.css`
- Create: `src/components/TagBadge.tsx`
- Create: `src/components/PlaceBadge.tsx`
- Create: `src/components/badges.css`

- [ ] **Step 1: Create SearchBar component**

Create `src/components/SearchBar.tsx`:
```typescript
import { useState, useEffect } from 'react'
import './SearchBar.css'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Шукаць слова...' }: Props) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 200)
    return () => clearTimeout(timer)
  }, [local, onChange])

  useEffect(() => {
    setLocal(value)
  }, [value])

  return (
    <div className="search-bar">
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
      />
      {local && (
        <button
          className="search-clear"
          onClick={() => { setLocal(''); onChange('') }}
          aria-label="Ачысціць"
        >
          ×
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create SearchBar CSS**

Create `src/components/SearchBar.css`:
```css
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}

.search-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 15px;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 20px;
  padding: 0 4px;
  line-height: 1;
}
```

- [ ] **Step 3: Create badge components**

Create `src/components/badges.css`:
```css
.tag-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--warning-bg);
  color: var(--warning);
}

.place-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.place-badge--used {
  background: var(--success-bg);
  color: var(--success);
}

.place-badge--not-used {
  background: var(--danger-bg);
  color: var(--danger);
}

.place-badge--unknown {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}
```

Create `src/components/TagBadge.tsx`:
```typescript
import './badges.css'

interface Props {
  tag: string
  onClick?: () => void
  active?: boolean
}

export function TagBadge({ tag, onClick, active }: Props) {
  const style = active
    ? { background: 'var(--accent-bg)', color: 'var(--accent)' }
    : undefined

  if (onClick) {
    return (
      <button className="tag-badge" style={style} onClick={onClick}>
        {tag}
      </button>
    )
  }
  return <span className="tag-badge">{tag}</span>
}
```

Create `src/components/PlaceBadge.tsx`:
```typescript
import './badges.css'

interface Props {
  name: string
  state: 'used' | 'not_used' | 'unknown'
}

export function PlaceBadge({ name, state }: Props) {
  const prefix = state === 'used' ? '✓' : state === 'not_used' ? '✗' : '?'
  return (
    <span className={`place-badge place-badge--${state.replace('_', '-')}`}>
      {prefix} {name}
    </span>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SearchBar.tsx src/components/SearchBar.css src/components/TagBadge.tsx src/components/PlaceBadge.tsx src/components/badges.css
git commit -m "feat: add SearchBar, TagBadge, and PlaceBadge components"
```

---

### Task 11: Tag and place filter chips

**Files:**
- Create: `src/components/TagFilterChips.tsx`
- Create: `src/components/PlaceFilterChips.tsx`
- Create: `src/components/FilterChips.css`

- [ ] **Step 1: Create filter chips CSS**

Create `src/components/FilterChips.css`:
```css
.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.filter-chip {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.filter-chip:hover {
  border-color: var(--accent);
}

.filter-chip--active {
  background: var(--accent-bg);
  color: var(--accent);
  border-color: var(--accent);
}

.place-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.place-filter select {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
}

.place-filter-states {
  display: flex;
  gap: 4px;
}

.place-state-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.place-state-btn--active-used {
  background: var(--success-bg);
  color: var(--success);
  border-color: var(--success);
}

.place-state-btn--active-not_used {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger);
}

.place-state-btn--active-unknown {
  background: var(--warning-bg);
  color: var(--warning);
  border-color: var(--warning);
}
```

- [ ] **Step 2: Create TagFilterChips component**

Create `src/components/TagFilterChips.tsx`:
```typescript
import './FilterChips.css'

interface Props {
  allTags: string[]
  selectedTags: string[]
  onToggle: (tag: string) => void
}

export function TagFilterChips({ allTags, selectedTags, onToggle }: Props) {
  if (allTags.length === 0) return null

  return (
    <div className="filter-chips">
      {allTags.map((tag) => (
        <button
          key={tag}
          className={`filter-chip ${selectedTags.includes(tag) ? 'filter-chip--active' : ''}`}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create PlaceFilterChips component**

Create `src/components/PlaceFilterChips.tsx`:
```typescript
import type { Place } from '../types'
import './FilterChips.css'

type PlaceFilterState = 'used' | 'not_used' | 'unknown'

interface PlaceFilter {
  placeId: string
  state: PlaceFilterState
}

interface Props {
  places: Place[]
  filter: PlaceFilter | null
  onChange: (filter: PlaceFilter | null) => void
}

const stateLabels: Record<PlaceFilterState, string> = {
  used: '✓',
  not_used: '✗',
  unknown: '?',
}

export function PlaceFilterChips({ places, filter, onChange }: Props) {
  if (places.length === 0) return null

  return (
    <div className="place-filter">
      <select
        value={filter?.placeId ?? ''}
        onChange={(e) => {
          if (e.target.value) {
            onChange({ placeId: e.target.value, state: filter?.state ?? 'used' })
          } else {
            onChange(null)
          }
        }}
      >
        <option value="">📍 Фільтр па месцы</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {filter && (
        <div className="place-filter-states">
          {(Object.keys(stateLabels) as PlaceFilterState[]).map((state) => (
            <button
              key={state}
              className={`place-state-btn ${filter.state === state ? `place-state-btn--active-${state}` : ''}`}
              onClick={() => onChange({ ...filter, state })}
            >
              {stateLabels[state]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TagFilterChips.tsx src/components/PlaceFilterChips.tsx src/components/FilterChips.css
git commit -m "feat: add tag and place filter chip components"
```

---

### Task 12: WordCard, WordList, and SearchPage assembly

**Files:**
- Create: `src/components/WordCard.tsx`
- Create: `src/components/WordCard.css`
- Create: `src/components/WordList.tsx`
- Modify: `src/pages/SearchPage.tsx` (replace)

- [ ] **Step 1: Create WordCard component**

Create `src/components/WordCard.tsx`:
```typescript
import { Link } from 'react-router-dom'
import type { Word, Place } from '../types'
import './WordCard.css'

interface Props {
  word: Word
  places: Place[]
}

export function WordCard({ word, places }: Props) {
  const placeNames = Object.entries(word.placeUsage)
    .filter(([, state]) => state === 'used')
    .map(([placeId]) => places.find((p) => p.id === placeId)?.name)
    .filter(Boolean)

  return (
    <Link to={`/word/${word.id}`} className="word-card">
      <div className="word-card-header">
        <span className="word-card-word">{word.word}</span>
        {word.partOfSpeech && (
          <span className="word-card-pos">{word.partOfSpeech}</span>
        )}
      </div>
      <div className="word-card-meaning">{word.meaning}</div>
      {(placeNames.length > 0 || word.tags.length > 0) && (
        <div className="word-card-meta">
          {placeNames.map((name) => (
            <span key={name} className="word-card-place">📍 {name}</span>
          ))}
          {word.tags.map((tag) => (
            <span key={tag} className="word-card-tag">{tag}</span>
          ))}
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create WordCard CSS**

Create `src/components/WordCard.css`:
```css
.word-card {
  display: block;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  color: inherit;
  text-decoration: none;
}

.word-card:hover {
  text-decoration: none;
}

.word-card-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.word-card-word {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.word-card-pos {
  font-size: 12px;
  color: var(--text-muted);
}

.word-card-meaning {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.word-card-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.word-card-place,
.word-card-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
}
```

- [ ] **Step 3: Create WordList component**

Create `src/components/WordList.tsx`:
```typescript
import type { Word, Place } from '../types'
import { WordCard } from './WordCard'

interface Props {
  words: Word[]
  places: Place[]
}

export function WordList({ words, places }: Props) {
  if (words.length === 0) {
    return <p className="empty-state">Нічога не знойдзена</p>
  }

  return (
    <div>
      {words.map((word) => (
        <WordCard key={word.id} word={word} places={places} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Implement SearchPage**

Replace `src/pages/SearchPage.tsx`:
```typescript
import { useState, useMemo, useCallback } from 'react'
import { useWords } from '../hooks/useWords'
import { usePlaces } from '../hooks/usePlaces'
import { filterWords, extractAllTags } from '../lib/search'
import { SearchBar } from '../components/SearchBar'
import { TagFilterChips } from '../components/TagFilterChips'
import { PlaceFilterChips } from '../components/PlaceFilterChips'
import { WordList } from '../components/WordList'
import './SearchPage.css'

interface PlaceFilter {
  placeId: string
  state: 'used' | 'not_used' | 'unknown'
}

export function SearchPage() {
  const { words, loading, error } = useWords()
  const { places } = usePlaces()
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter | null>(null)

  const allTags = useMemo(() => extractAllTags(words), [words])

  const filtered = useMemo(
    () => filterWords(words, { query, tags: selectedTags, placeFilter }),
    [words, query, selectedTags, placeFilter],
  )

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }, [])

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Паўтарыць</button>
      </div>
    )
  }

  if (words.length === 0) {
    return <div className="empty-state">Слоўнік пакуль пусты</div>
  }

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} />
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggle={handleTagToggle}
      />
      <PlaceFilterChips
        places={places}
        filter={placeFilter}
        onChange={setPlaceFilter}
      />
      <WordList words={filtered} places={places} />
      <div className="word-count">{filtered.length} з {words.length} слоў</div>
    </div>
  )
}
```

- [ ] **Step 5: Create SearchPage CSS**

Create `src/pages/SearchPage.css`:
```css
.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.error-state {
  text-align: center;
  padding: 40px;
  color: var(--danger);
}

.error-state button {
  margin-top: 12px;
  padding: 8px 16px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 6px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 15px;
}

.word-count {
  text-align: center;
  padding: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
```

- [ ] **Step 6: Verify build**

Run:
```bash
npm run build
```
Expected: Clean build.

- [ ] **Step 7: Commit**

```bash
git add src/components/WordCard.tsx src/components/WordCard.css src/components/WordList.tsx src/pages/SearchPage.tsx src/pages/SearchPage.css
git commit -m "feat: implement search/browse page with filtering"
```

---

## Chunk 5: Word Detail and Word Form Pages

### Task 13: Word Detail page

**Files:**
- Modify: `src/pages/WordDetailPage.tsx` (replace)
- Create: `src/pages/WordDetailPage.css`
- Create: `src/components/RelatedWordLink.tsx`

- [ ] **Step 1: Create RelatedWordLink component**

Create `src/components/RelatedWordLink.tsx`:
```typescript
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
```

- [ ] **Step 2: Implement WordDetailPage**

Replace `src/pages/WordDetailPage.tsx`:
```typescript
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
```

- [ ] **Step 3: Create WordDetailPage CSS**

Create `src/pages/WordDetailPage.css`:
```css
.word-detail {
  padding-bottom: 24px;
}

.back-link {
  font-size: 14px;
  color: var(--accent);
  display: inline-block;
  margin-bottom: 12px;
}

.word-detail-word {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.word-detail-pos {
  font-size: 14px;
  color: var(--text-secondary);
}

.detail-section {
  margin-top: 20px;
}

.detail-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-weight: 400;
}

.example-quote {
  font-size: 14px;
  color: var(--text-secondary);
  font-style: italic;
  background: var(--bg-secondary);
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid var(--accent);
  margin-bottom: 6px;
}

.badge-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-admin {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.edit-button {
  display: block;
  text-align: center;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 14px;
  text-decoration: none;
}

.edit-button:hover {
  border-color: var(--accent);
  color: var(--accent);
  text-decoration: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/WordDetailPage.tsx src/pages/WordDetailPage.css src/components/RelatedWordLink.tsx
git commit -m "feat: implement word detail page with all fields"
```

---

### Task 14: PlaceUsageToggle component with test

**Files:**
- Create: `src/components/PlaceUsageToggle.tsx`
- Create: `src/components/PlaceUsageToggle.css`
- Create: `src/components/__tests__/PlaceUsageToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/PlaceUsageToggle.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaceUsageToggle } from '../PlaceUsageToggle'

describe('PlaceUsageToggle', () => {
  it('displays place name', () => {
    render(<PlaceUsageToggle name="Хатынічы" state={undefined} onChange={() => {}} />)
    expect(screen.getByText('Хатынічы')).toBeInTheDocument()
  })

  it('cycles unknown → used on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state={undefined} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('used')
  })

  it('cycles used → not_used on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state="used" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('not_used')
  })

  it('cycles not_used → unknown on click', async () => {
    const onChange = vi.fn()
    render(<PlaceUsageToggle name="Хатынічы" state="not_used" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/__tests__/PlaceUsageToggle.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PlaceUsageToggle**

Create `src/components/PlaceUsageToggle.tsx`:
```typescript
import type { PlaceUsageState } from '../types'
import './PlaceUsageToggle.css'

interface Props {
  name: string
  state: PlaceUsageState | undefined
  onChange: (state: PlaceUsageState | undefined) => void
}

const nextState: Record<string, PlaceUsageState | undefined> = {
  undefined: 'used',
  used: 'not_used',
  not_used: undefined,
}

const stateDisplay: Record<string, { icon: string; label: string; className: string }> = {
  undefined: { icon: '?', label: 'невядома', className: 'toggle--unknown' },
  used: { icon: '✓', label: 'выкарыстоўваецца', className: 'toggle--used' },
  not_used: { icon: '✗', label: 'не выкарыстоўваецца', className: 'toggle--not-used' },
}

export function PlaceUsageToggle({ name, state, onChange }: Props) {
  const key = String(state)
  const display = stateDisplay[key]
  const next = nextState[key]

  return (
    <button
      type="button"
      className={`place-usage-toggle ${display.className}`}
      onClick={() => onChange(next)}
    >
      <span className="toggle-icon">{display.icon}</span>
      <span className="toggle-name">{name}</span>
      <span className="toggle-label">{display.label}</span>
    </button>
  )
}
```

- [ ] **Step 4: Create PlaceUsageToggle CSS**

Create `src/components/PlaceUsageToggle.css`:
```css
.place-usage-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.toggle-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.toggle--unknown .toggle-icon {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.toggle--used .toggle-icon {
  background: var(--success-bg);
  color: var(--success);
}

.toggle--not-used .toggle-icon {
  background: var(--danger-bg);
  color: var(--danger);
}

.toggle-name {
  flex: 1;
  font-size: 14px;
}

.toggle-label {
  font-size: 11px;
  color: var(--text-muted);
}

.toggle--used .toggle-label { color: var(--success); }
.toggle--not-used .toggle-label { color: var(--danger); }
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
npx vitest run src/components/__tests__/PlaceUsageToggle.test.tsx
```
Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlaceUsageToggle.tsx src/components/PlaceUsageToggle.css src/components/__tests__/PlaceUsageToggle.test.tsx
git commit -m "feat: add PlaceUsageToggle with tap-to-cycle and tests"
```

---

### Task 15: Word Form page (add/edit)

**Files:**
- Modify: `src/pages/WordFormPage.tsx` (replace)
- Create: `src/pages/WordFormPage.css`

- [ ] **Step 1: Implement WordFormPage**

Replace `src/pages/WordFormPage.tsx`:
```typescript
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
```

- [ ] **Step 2: Create WordFormPage CSS**

Create `src/pages/WordFormPage.css`:
```css
.word-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.word-form h1 {
  font-size: 22px;
  font-weight: 700;
}

.form-error {
  background: var(--danger-bg);
  color: var(--danger);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 15px;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.example-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.example-row .form-input {
  flex: 1;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 20px;
  padding: 0 6px;
}

.add-btn {
  font-size: 13px;
  color: var(--accent);
  background: none;
  border: none;
  text-align: left;
  padding: 4px 0;
}

.autocomplete-list {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 4px;
}

.autocomplete-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  border-bottom: 1px solid var(--border);
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.autocomplete-item:hover {
  background: var(--accent-bg);
}

.related-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.related-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent-bg);
  color: var(--accent);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 13px;
}

.related-chip button {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 16px;
  padding: 0;
  line-height: 1;
}

.submit-btn {
  padding: 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npm run build
```
Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/pages/WordFormPage.tsx src/pages/WordFormPage.css
git commit -m "feat: implement word add/edit form with place toggles and autocomplete"
```

---

### Task 15b: WordFormPage validation test

**Files:**
- Create: `src/pages/__tests__/WordFormPage.test.tsx`

- [ ] **Step 1: Write the validation test**

Create `src/pages/__tests__/WordFormPage.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock Firebase and hooks
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {},
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: true, loading: false, error: null }),
}))

vi.mock('../../hooks/useWords', () => ({
  useWords: () => ({ words: [], loading: false, error: null }),
}))

vi.mock('../../hooks/usePlaces', () => ({
  usePlaces: () => ({ places: [], loading: false, error: null }),
}))

vi.mock('../../lib/words', () => ({
  addWord: vi.fn(),
  updateWord: vi.fn(),
}))

import { WordFormPage } from '../WordFormPage'

describe('WordFormPage validation', () => {
  const renderForm = () =>
    render(
      <MemoryRouter initialEntries={['/word/new']}>
        <WordFormPage />
      </MemoryRouter>,
    )

  it('shows error when submitting empty form', async () => {
    renderForm()
    await userEvent.click(screen.getByText('Захаваць'))
    expect(screen.getByText('Слова і значэнне абавязковыя')).toBeInTheDocument()
  })

  it('shows error when only word is filled', async () => {
    renderForm()
    const inputs = screen.getAllByRole('textbox')
    await userEvent.type(inputs[0], 'бульба')
    await userEvent.click(screen.getByText('Захаваць'))
    expect(screen.getByText('Слова і значэнне абавязковыя')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
npx vitest run src/pages/__tests__/WordFormPage.test.tsx
```
Expected: Both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/__tests__/WordFormPage.test.tsx
git commit -m "test: add WordFormPage required field validation tests"
```

---

## Chunk 6: Places Admin, Deployment, Final Polish

### Task 16: Places Admin page

**Files:**
- Modify: `src/pages/PlacesAdminPage.tsx` (replace)
- Create: `src/pages/PlacesAdminPage.css`

- [ ] **Step 1: Implement PlacesAdminPage**

Replace `src/pages/PlacesAdminPage.tsx`:
```typescript
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePlaces } from '../hooks/usePlaces'
import { addPlace, updatePlace, deletePlace } from '../lib/places'
import './PlacesAdminPage.css'

interface PlaceForm {
  name: string
  region: string
  lat: string
  lng: string
}

const emptyForm: PlaceForm = { name: '', region: '', lat: '', lng: '' }

export function PlacesAdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { places, loading } = usePlaces()
  const [form, setForm] = useState<PlaceForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isAdmin) {
    navigate('/')
    return null
  }

  if (loading) return <div className="loading">Загрузка...</div>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    const data = {
      name: form.name.trim(),
      region: form.region.trim(),
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updatePlace(editingId, data)
      } else {
        await addPlace(data)
      }
      setForm(emptyForm)
      setEditingId(null)
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const startEdit = (id: string) => {
    const place = places.find((p) => p.id === id)
    if (!place) return
    setEditingId(id)
    setForm({
      name: place.name,
      region: place.region,
      lat: place.lat?.toString() ?? '',
      lng: place.lng?.toString() ?? '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Выдаліць месца?')) return
    await deletePlace(id)
  }

  return (
    <div className="places-admin">
      <Link to="/" className="back-link">← назад</Link>
      <h1>Месцы</h1>

      <form className="place-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Назва *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className="form-input"
          required
        />
        <input
          type="text"
          placeholder="Рэгіён"
          value={form.region}
          onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
          className="form-input"
        />
        <div className="coord-row">
          <input
            type="number"
            step="any"
            placeholder="Шырата"
            value={form.lat}
            onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
            className="form-input"
          />
          <input
            type="number"
            step="any"
            placeholder="Даўгата"
            value={form.lng}
            onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
            className="form-input"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={saving}>
          {editingId ? 'Абнавіць' : 'Дадаць'}
        </button>
        {editingId && (
          <button
            type="button"
            className="cancel-btn"
            onClick={() => { setForm(emptyForm); setEditingId(null) }}
          >
            Скасаваць
          </button>
        )}
      </form>

      <div className="places-list-admin">
        {places.map((place) => (
          <div key={place.id} className="place-item">
            <div>
              <strong>{place.name}</strong>
              {place.region && <span className="place-region"> — {place.region}</span>}
              {place.lat != null && place.lng != null && (
                <span className="place-coords"> ({place.lat}, {place.lng})</span>
              )}
            </div>
            <div className="place-actions">
              <button onClick={() => startEdit(place.id)}>✏️</button>
              <button onClick={() => handleDelete(place.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PlacesAdminPage CSS**

Create `src/pages/PlacesAdminPage.css`:
```css
.places-admin h1 {
  font-size: 22px;
  margin-bottom: 16px;
}

.place-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.coord-row {
  display: flex;
  gap: 8px;
}

.coord-row .form-input {
  flex: 1;
}

.cancel-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  color: var(--text-secondary);
  font-size: 14px;
}

.places-list-admin {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.place-region {
  color: var(--text-secondary);
  font-size: 14px;
}

.place-coords {
  color: var(--text-muted);
  font-size: 12px;
}

.place-actions {
  display: flex;
  gap: 4px;
}

.place-actions button {
  background: none;
  border: none;
  font-size: 16px;
  padding: 4px 6px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlacesAdminPage.tsx src/pages/PlacesAdminPage.css
git commit -m "feat: implement places admin page"
```

---

### Task 17: GitHub Actions deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow file**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm test -- --run

      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Add test script to package.json**

Ensure `package.json` has:
```json
"scripts": {
  "test": "vitest"
}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions workflow for Pages deployment"
```

---

### Task 18: Final cleanup and delete boilerplate

**Files:**
- Delete: `src/App.css` (Vite boilerplate, unused)
- Delete: `src/assets/` (Vite boilerplate, unused)

- [ ] **Step 1: Remove Vite boilerplate files**

Run:
```bash
rm -f src/App.css
rm -rf src/assets/
```

- [ ] **Step 2: Run all tests**

Run:
```bash
npx vitest run
```
Expected: All tests pass (auth parsing, search/filter, PlaceUsageToggle).

- [ ] **Step 3: Verify full build**

Run:
```bash
npm run build
```
Expected: Clean build, no warnings.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: remove Vite boilerplate and verify clean build"
```

---

## Post-Implementation Checklist

After all tasks are complete, manually verify:

1. **Firebase setup**: Create project, enable Firestore + Anonymous Auth, create `config/admin` document, deploy security rules, seed a few places
2. **Local `.env.local`**: Copy Firebase config from console
3. **`npm run dev`**: Open app, verify theme switching, search page loads
4. **Admin flow**: Navigate to `http://localhost:5173/#admin=your-secret` — verify admin badge, add/edit buttons
5. **Add a word**: Fill out the form, save, verify it appears in the list
6. **Search**: Type part of a word, verify filtering works
7. **GitHub**: Create repo remote, add Firebase config as GitHub secrets, push, verify deployment
8. **DNS**: Add CNAME record for `words.ms7k.com`
