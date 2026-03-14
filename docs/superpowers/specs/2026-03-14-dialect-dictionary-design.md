# Dialect Dictionary Web App — Design Spec

## Context

The user is learning a Belarusian dialect from weekly calls with their parents. They collect new words, meanings, usage examples, and notes about where each word is spoken. Currently this is done in freeform notes. This app replaces that with a searchable, structured dictionary that can be accessed from phone and desktop.

**Phase 1 scope**: Search/browse words (public), add/edit words (admin only).
**Phase 2 (future)**: Flashcards/spaced repetition, audio clips, map visualization, community contributions.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  React + TS + Vite  │  ←───→  │  Firebase Firestore   │
│  (GitHub Pages)     │         │  (free tier)          │
│                     │         │                       │
│  words.ms7k.com     │         │  + Anonymous Auth     │
└─────────────────────┘         └──────────────────────┘
```

- **Frontend**: React 19 + TypeScript + Vite, deployed to GitHub Pages
- **Database**: Firebase Firestore (50K reads/20K writes per day free)
- **Auth**: Firebase Anonymous Auth triggered by a secret URL hash (`#admin=secret`)
- **Theme**: Auto light/dark following OS `prefers-color-scheme`
- **UI language**: Belarusian (Cyrillic)
- **Definitions**: Written in Russian/Belarusian

## Data Model

### Collection: `words/{id}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `word` | string | yes | The dialect word (Cyrillic) |
| `meaning` | string | yes | Definition in Russian/Belarusian |
| `placeUsage` | map<string, "used" \| "not_used"> | no | Place ID → usage state. Absent = unknown. |
| `examples` | string[] | no | Usage examples |
| `partOfSpeech` | string | no | Noun, verb, etc. (in Belarusian) |
| `relatedWords` | string[] | no | IDs of related word documents (unidirectional — linking A→B does not auto-link B→A) |
| `source` | string | no | Who taught this word ("Мама", "Тата") |
| `tags` | string[] | no | Free-form tags ("ежа", "гаспадарка") |
| `createdAt` | Timestamp | auto | Set on creation |
| `updatedAt` | Timestamp | auto | Set on every update |

### Collection: `places/{id}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Village/city name |
| `lat` | number | no | Latitude |
| `lng` | number | no | Longitude |
| `region` | string | no | Region name |

### Collection: `admins/{uid}`

| Field | Type | Description |
|-------|------|-------------|
| `secret` | string | Validated by security rules on write, never readable |

### Document: `config/admin`

| Field | Type | Description |
|-------|------|-------------|
| `secret` | string | The admin secret. Not readable by clients. |

## Place Usage — Three States

Each word × place has three possible states:
- **Used** (`"used"`) — confirmed spoken in that place
- **Not used** (`"not_used"`) — confirmed NOT spoken there
- **Unknown** (key absent from map) — haven't asked yet

This enables filtering: "show words spoken in village X", "show words NOT spoken in village X", and "show words I haven't checked for village X" (useful for preparing for the next parent call).

## Authentication Flow

1. User opens bookmarked URL: `https://words.ms7k.com/#admin=my-secret`
2. App extracts secret from hash, cleans URL via `history.replaceState`
3. Stores secret in `sessionStorage`
4. Signs in with Firebase Anonymous Auth (creates a new anonymous UID per browser/device)
5. Writes to `admins/{uid}` — Firestore rules validate the secret against `config/admin`
6. If successful, `isAdmin = true` for the session
7. If registration fails (wrong secret or network error): show a brief toast "Не ўдалося ўвайсці як адмін" ("Failed to sign in as admin"), fall back to public read-only mode. The user can retry by navigating to their admin bookmark again.
8. Public users see no hash, no auth attempt, `isAdmin = false`

**Stale admin UIDs**: Anonymous Auth creates a new UID per browser session. Old `admins/{uid}` documents accumulate over time since delete is disabled. This is acceptable for a single-admin app — cleanup can be done manually via Firebase Console if needed.

## Firestore Security Rules

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

## Screens

### 1. Search/Browse (public, route: `/`)
- Search bar with type-ahead (case-insensitive substring match on word + meaning)
- Tag filter chips (OR logic — word must have at least one selected tag)
- Place filter with three-state toggle (used/not used/unknown in place X)
- Word list: each card shows word, meaning, part of speech, place badges, tag badges
- Word count at bottom
- Sorted alphabetically using `Intl.Collator('be')`

### 2. Word Detail (public, route: `/word/:id`)
- All fields displayed with Belarusian section labels
- Place badges with color coding (green=used, red=not used)
- Related word links (clickable, navigate to that word)
- Edit button visible only to admin

### 3. Add/Edit Word (admin, route: `/word/new` or `/word/:id/edit`)
- All fields as form inputs
- Place usage: tap-to-cycle toggles (? → ✓ → ✗ → ?)
- Tags: comma-separated input with autocomplete from existing tags
- Related words: inline autocomplete field — type to search existing words, select from dropdown, added words appear as removable chips below the input
- Examples: add/remove multiple entries (each is a text input with a + button to add more and × to remove)
- Part of speech: dropdown with values: назоўнік, дзеяслоў, прыметнік, прыслоўе, займеннік, лічэбнік, прыназоўнік, злучнік, часціца, выклічнік
- Source: free text with autocomplete from existing sources
- Validation: word and meaning are required

### 4. Places Admin (admin, route: `/admin/places`)
- List of places with inline editing
- Add place form (name, region, lat, lng)

## Search & Filter Implementation

All filtering is client-side. On mount, the app loads the entire `words` collection via `onSnapshot` (real-time listener). For a personal dictionary (<1000-5000 words), this is efficient and enables instant search without server round-trips.

- **Text search**: `String.includes()` on lowercased word and meaning fields
- **Tag filter**: Intersection check (OR logic)
- **Place filter**: Map lookup for used/not_used, key absence for unknown
- **Combined**: All filters AND-combined
- **Debounce**: Text search input debounced at 200ms to avoid jank on low-end phones

### Loading & Error States

- **Loading**: Show a centered spinner/skeleton while Firestore subscriptions initialize
- **Error**: If Firestore is unreachable, show "Не ўдалося загрузіць дадзеныя" ("Failed to load data") with a retry button
- **Empty state**: "Слоўнік пакуль пусты" ("Dictionary is empty") when no words exist
- **No results**: "Нічога не знойдзена" ("Nothing found") when search/filter returns no matches
- **Offline**: Firestore SDK has built-in offline persistence — previously loaded data remains available. Writes queue and sync when back online.

## Tech Stack

### Production dependencies
- `react` ^19, `react-dom` ^19
- `react-router-dom` ^7
- `firebase` ^11 (Firestore + Auth, tree-shaken)

### Dev dependencies
- `vite` ^6, `typescript` ^5.7
- `vitest`, `@testing-library/react` (testing)

### Not included (intentionally)
- No CSS framework — plain CSS with custom properties for theming
- No state management library — React Context + hooks
- No form library — controlled inputs
- No search library — substring search on small dataset

Estimated production bundle: ~100-120KB gzipped.

## Bootstrap / Initial Setup

Before the app works, these one-time manual steps are required:

1. **Create Firebase project** at console.firebase.google.com
2. **Enable Firestore** in production mode
3. **Enable Anonymous Auth** in Firebase Console → Authentication → Sign-in providers
4. **Create `config/admin` document** in Firestore Console with field `secret: "your-chosen-secret"`
5. **Deploy security rules** via Firebase Console or CLI (copy from the Security Rules section above)
6. **Seed initial places** via Firebase Console — add a few villages to the `places` collection
7. **Copy Firebase config** (apiKey, projectId, appId) to `.env.local` for local development

## Deployment

- GitHub Actions builds on push to `main`, deploys to GitHub Pages
- `public/CNAME` contains `words.ms7k.com`
- DNS: CNAME record `words.ms7k.com` → `<username>.github.io`
- SPA routing: `public/404.html` redirect trick (see [spa-github-pages](https://github.com/rafgraph/spa-github-pages))
- Firebase config values stored as GitHub Actions secrets (`VITE_FIREBASE_*`) — note: these are **not sensitive**. Firebase web config (apiKey, projectId, appId) is designed to be public and embedded in client bundles. Security is enforced by Firestore rules, not by hiding config. GitHub Actions secrets are used only for build-time cleanliness.

## Project Structure

```
src/
├── main.tsx
├── App.tsx
├── index.css                    # Global styles, CSS custom properties
├── config/
│   └── firebase.ts              # Firebase init
├── hooks/
│   ├── useAuth.ts               # Hash parsing, anonymous auth, admin state
│   ├── useWords.ts              # Real-time words subscription
│   ├── usePlaces.ts             # Real-time places subscription
│   ├── useSearch.ts             # Search + filter logic
│   └── useTheme.ts              # OS preference detection
├── contexts/
│   └── AuthContext.tsx
├── types/
│   └── index.ts                 # Word, Place, PlaceUsageMap interfaces
├── lib/
│   ├── words.ts                 # Firestore CRUD for words
│   ├── places.ts                # Firestore CRUD for places
│   └── search.ts                # Client-side search/filter utilities
├── components/
│   ├── Layout.tsx
│   ├── SearchBar.tsx
│   ├── TagFilterChips.tsx
│   ├── PlaceFilterChips.tsx
│   ├── WordCard.tsx
│   ├── WordList.tsx
│   ├── PlaceUsageToggle.tsx
│   ├── PlaceBadge.tsx
│   ├── TagBadge.tsx
│   ├── RelatedWordLink.tsx
│   ├── AdminGuard.tsx
│   └── ConfirmDialog.tsx
└── pages/
    ├── SearchPage.tsx
    ├── WordDetailPage.tsx
    ├── WordFormPage.tsx
    └── PlacesAdminPage.tsx
```

## Verification Plan

### Automated tests (vitest + @testing-library/react)
- `src/lib/search.ts` — text search with Cyrillic, tag filtering, place usage filtering (all three states), combined filters
- `src/hooks/useAuth.ts` — hash parsing logic (extract pure function and test it)
- `PlaceUsageToggle` — cycles through three states on click
- `WordFormPage` — required field validation (word and meaning)

### Manual integration tests
1. **Local dev**: `npm run dev` — verify search, filtering, theme switching
2. **Admin flow**: Open with `#admin=secret` — verify edit buttons appear, can add/edit words
3. **Public flow**: Open without hash — verify read-only, no edit buttons
4. **Mobile**: Test on phone browser — verify responsive layout, tap-to-cycle works
5. **Deployment**: Push to main — verify GitHub Actions builds and deploys, custom domain works
6. **Firestore rules**: Verify public can read, only admin can write, config is not readable
7. **Search**: Add several words, verify text search, tag filter, and place filter all work correctly with Cyrillic text
