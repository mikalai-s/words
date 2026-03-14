# Dialect Dictionary App (Слоўнік)

A web app for collecting, searching, and browsing Belarusian dialect words learned from weekly parent calls.

**Live**: https://mikalai-s.github.io/words/

## Architecture

- **Frontend**: React 19 + TypeScript + Vite, deployed to GitHub Pages
- **Database**: Firebase Firestore (free tier, project: `words-3e257`)
- **Auth**: Firebase Anonymous Auth + secret URL hash (`#admin=<secret>`)
- **Theme**: Auto light/dark following OS preference
- **UI language**: Belarusian (Cyrillic)
- **No backend server** — static files on GitHub Pages, Firestore SDK talks directly to the database

## Key Design Decisions

- **Client-side search**: Entire word collection loaded via Firestore `onSnapshot` and filtered in-memory. Correct for <5000 words; avoids server-side search complexity.
- **Three-state place usage**: Each word × place = "used", "not_used", or unknown (absent from map). Enables filtering "show me words I haven't checked for village X" — useful for preparing for parent calls.
- **Admin via URL hash**: `#admin=<secret>` triggers Firebase Anonymous Auth → writes to `admins/{uid}` (validated by security rules against `config/admin.secret`). No login screen needed.
- **Security rules allow both create and update on admins collection**: `setDoc` does upserts, and React StrictMode double-renders effects, so `create`-only rules would fail on the second call.
- **`base: '/words/'` in vite.config.ts**: Required because GitHub Pages serves from `mikalai-s.github.io/words/` (repo name subdirectory). `BrowserRouter` uses `import.meta.env.BASE_URL` as basename.
- **SPA routing on GitHub Pages**: `public/404.html` redirect trick (rafgraph/spa-github-pages pattern) since GitHub Pages doesn't support server-side rewrites.
- **No CSS framework**: Plain CSS with custom properties for theming. App is small enough that a framework adds more complexity than it saves.
- **Belarusian locale sorting**: `Intl.Collator('be')` used in `filterWords()` for correct Cyrillic alphabetical order.

## Project Structure

```
src/
├── config/firebase.ts      — Firebase init (Firestore + Auth)
├── contexts/AuthContext.tsx — Admin auth flow + useAuth hook
├── hooks/                  — useWords, usePlaces, useTheme, useSearch
├── lib/                    — Pure functions: search.ts, words.ts, places.ts, auth.ts
├── components/             — Reusable UI: SearchBar, badges, filters, PlaceUsageToggle
├── pages/                  — SearchPage, WordDetailPage, WordFormPage, PlacesAdminPage
└── types/index.ts          — Word, Place, PlaceUsageMap, WordFormData
```

## Setup on a New Machine

```bash
git clone git@github.com:mikalai-s/words.git
cd words
npm install                    # .npmrc ensures public registry is used
cp .env.example .env.local     # Then fill in the values below
npm run dev                    # http://localhost:5173
```

Fill in `.env.local` with Firebase web config values. Get them from:
- Firebase Console → Project settings → Your apps → Web app → Config
- Or run: `firebase apps:sdkconfig WEB --project words-3e257`

**Admin access**: Open the app with `#admin=<secret>` in the URL. The secret is stored in `config/admin` document in Firestore (not in the repo).

**Firebase CLI** (only needed for deploying security rules):
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## Development

```bash
npm run dev          # Local dev server
npm test             # Run vitest
npm run build        # Production build
```

## Deployment

Push to `main` → GitHub Actions builds + deploys to GitHub Pages automatically.
Firebase security rules: deploy via `firebase deploy --only firestore:rules`.

## Phase 2 (Future)

- Flashcard/spaced repetition system (Anki-like)
- Audio clip attachments per word
- Map visualization of dialect distribution using place coordinates
- Community contributions with approval workflow

## Detailed Docs

- Design spec (all decisions + data model): `docs/superpowers/specs/2026-03-14-dialect-dictionary-design.md`
- Implementation plan (task breakdown): `docs/superpowers/plans/2026-03-14-dialect-dictionary.md`
