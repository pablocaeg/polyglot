# Contributing to Polyglot

Thanks for your interest in contributing! This guide will help you get set up and understand the project conventions.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Copy the env file: `cp .env.example .env`
4. Add your `DEEPSEEK_API_KEY` to `.env` (required for AI features; UI-only work doesn't need it)
5. Start the dev server: `npm run dev`

## Development Workflow

```bash
# Create a feature branch
git checkout -b feat/your-feature

# Run the dev server
npm run dev

# Run tests
npm test

# Type-check and lint before committing
npm run build
npm run lint
```

## Project Conventions

### Theme System

All colors use CSS custom property tokens (`--t-*`) mapped through Tailwind as `th-*` utilities. **Never use raw Tailwind colors** like `text-white` or `bg-blue-500` — they will break on 5 of 6 themes.

```tsx
// Good
<div className="bg-th-surface text-th-primary border-th-border" />

// Bad — breaks non-modern themes
<div className="bg-gray-900 text-white border-gray-700" />
```

Border radii also use tokens: `rounded-[var(--t-r-card)]`, `rounded-[var(--t-r-btn)]`, etc.

### Internationalization

All user-visible strings must use `t('key')` from `react-i18next`. When adding new strings:

1. Add the key to all three locale files: `src/i18n/locales/en.json`, `pl.json`, `es.json`
2. Use nested keys matching the existing structure (e.g., `nav.home`, `settings.fontSize`)
3. Polish and Spanish translations can be approximate — native speakers will review them

### State Management

- **Small settings** (language, theme, preferences): Zustand store with `persist` middleware (localStorage)
- **Large data** (texts, words, activity): IndexedDB via the `idb` library through `src/services/storage.ts`
- Each store lives in `src/stores/` as `use<Name>Store.ts`

### Components

- Functional components with default exports
- Use `memo()` for components that render in lists or receive stable props
- Icons are inline SVGs in `src/components/Icons.tsx` — no external icon library
- Lazy-load route components in `src/main.tsx`

### TypeScript

- Strict mode is enabled — no `any` types in new code
- Use `import type` for type-only imports
- Types live in `src/types/index.ts`

## What to Work On

Check the [Issues](../../issues) tab for tasks labeled `good first issue` or `help wanted`. Some areas that always welcome contributions:

- **New UI language** — add a locale file in `src/i18n/locales/` and register it
- **Accessibility** — ARIA labels, keyboard navigation, screen reader support
- **Tests** — expand coverage of utility functions and stores
- **Themes** — create new visual themes following the existing CSS custom property pattern

## Pull Request Process

1. Make sure `npm run build` and `npm test` pass
2. Keep PRs focused — one feature or fix per PR
3. Write a clear description of what changed and why
4. If adding UI, test across at least 2 themes (one dark, one light)
5. Update locale files if you added user-visible strings

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind and constructive.
