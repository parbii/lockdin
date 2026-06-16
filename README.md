# LOCKD In

A daily discipline system for college students. Ten mindset modules, programmatic habit tracking, and campus community feeds in one app.

## Stack

- Next.js 14+ (App Router) · TypeScript · Tailwind v4
- Firebase Auth + Firestore + Storage + Remote Config
- Framer Motion · TanStack Query · Zustand · shadcn-style primitives

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in your Firebase web app credentials
npm run dev
```

Open http://localhost:3000.

## Firebase setup

1. Create a Firebase project at https://console.firebase.google.com.
2. Add a web app and copy the config into `.env.local`.
3. Enable **Authentication → Email/Password** and **Google** providers.
4. Create a **Cloud Firestore** database in production mode.
5. Deploy rules and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

## Architecture

- **Curriculum** lives in `public/curriculum/v1/modules.json` — static, cached, never touches Firestore. Updates via Remote Config in a future release.
- **Per-user progress** lives at `users/{uid}/moduleProgress/{moduleId}`. Single real-time listener per active module.
- **Goals** live at `users/{uid}/goals/{goalId}` and have an `isPublic` flag that mirrors check-ins to `/feed`.
- **Denormalized summary fields** on `users/{uid}` (modulesCompleted, lockdInStatus, currentStreak) keep home-screen reads to a single document.
- All list queries are paginated with `limit(20)`. `onSnapshot` is reserved for the user summary and the active module.

## Project structure

```
src/
├── app/                      Next.js App Router
│   ├── page.tsx              Landing + auth
│   ├── onboarding/           First-time setup flow
│   └── app/                  Authenticated shell
│       ├── home/
│       ├── mindset/
│       ├── goals/
│       ├── community/
│       └── me/
├── components/
│   ├── providers.tsx         Auth + TanStack Query
│   ├── ui/                   Button, Card, Input, ProgressRing, LockdInBadge, StreakFlame
│   └── sections/             Section renderers (text, reflection, journal, link, quiz)
├── lib/
│   ├── firebase.ts
│   ├── firestore/            Typed CRUD per collection
│   ├── curriculum.ts
│   ├── motion.ts             Shared Framer variants
│   └── utils.ts
├── types/
public/curriculum/v1/modules.json
firestore.rules
firestore.indexes.json
```

## What's in v1

- Auth (Google + .edu email) with onboarding
- 10-module Mindset Hub with text, reflection, journal-streak, external-link, and quiz section types
- LOCKD In status unlock at 10/10 with celebration
- Goals CRUD, daily check-ins, public/private toggle, streaks
- Community feed (public check-ins) + org browse and join

## Roadmap

- Org wall posts and reactions
- Push notifications
- Recruiter portal
- Shareable LOCKD In certificate
