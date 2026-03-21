# Polyglot — Claude Code Project Guide

## Quick Reference

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Type-check + production build
npm run lint         # ESLint (0 errors expected, warnings OK)
npm test             # Vitest in watch mode
npm run test:run     # Vitest single run
npm run server       # Start Express production server
npm start            # Build + server
```

## Architecture

- **Frontend**: React 19 + TypeScript 5.9 (strict) + Vite 8 + Tailwind CSS 4
- **State**: Zustand 5 (localStorage persist for settings, IndexedDB for data)
- **i18n**: i18next with 3 UI languages (en, es, pl)
- **Backend**: Express 5 + DeepSeek API + optional PostgreSQL
- **PWA**: vite-plugin-pwa with service worker

## Critical Conventions

### Theme System (NEVER use raw colors)
```tsx
// Correct
<div className="bg-th-surface text-th-primary border-th-border rounded-[var(--t-r-card)]" />

// WRONG — breaks 5 of 6 themes
<div className="bg-gray-900 text-white border-gray-700 rounded-lg" />
```

### i18n (ALL visible strings must use t())
```tsx
const { t } = useTranslation()
// Every user-visible string → t('section.key')
// New keys must be added to ALL 3 locale files: en.json, es.json, pl.json
```

### Types
- `SkillLevel`: `'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'` (CEFR levels)
- `Language`: `'pl' | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'nl'`
- All types in `src/types/index.ts`

### ESLint
- `scripts/` is excluded from linting
- `server/` and `vite.config.ts` allow `any` and empty catch blocks
- Underscore-prefixed params (`_next`) are allowed unused in server code

## AI Agents

This project includes 12 specialized Claude Code agents in `.claude/agents/`.
See `docs/AGENTS.md` for usage guide and pipeline diagram.

### Quick Start
```
# Explore the codebase
/agent polyglot-expert "How does the spaced repetition system work?"

# Build a new component
/agent polyglot-contribute "Add a word-of-the-day widget to the home page"

# Review your changes
/agent polyglot-reviewer

# Final quality gate
/agent polyglot-challenger
```
