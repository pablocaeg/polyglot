<div align="center">

# Polyglot

**Learn languages by reading, not memorizing.**

An AI-powered language learning app that generates reading material at your level, lets you tap any word for instant translation, and uses spaced repetition to make vocabulary stick.

[![CI](https://github.com/pablocaeg/polyglot/actions/workflows/ci.yml/badge.svg)](https://github.com/pablocaeg/polyglot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/pablocaeg/polyglot/blob/master/CONTRIBUTING.md)

<!-- Add a screenshot or GIF here:
![Polyglot Screenshot](docs/screenshot.png)
-->

</div>

---

## Why Polyglot?

Most language apps drill you on isolated words. Polyglot takes a different approach: **you learn by reading**. The AI generates texts matched to your CEFR level (A1 through C2), and you pick up vocabulary naturally from context. Words you struggle with get saved and scheduled for review using the SM-2 spaced repetition algorithm — the same system used by Anki.

## Features

**Read** — AI-generated texts in 8 languages, tailored to your level. Tap any word for instant translation with grammar notes. Double-tap a sentence for its full translation. Text-to-speech with word-by-word highlighting.

**Learn** — Save words while reading or add your own manually. Every saved word enters the spaced repetition system and gets scheduled for review at the optimal time.

**Practice** — Flashcards with swipe gestures and keyboard shortcuts. Multiple-choice quizzes generated from your vocabulary. Due words are surfaced automatically.

**Track** — XP, levels, achievements, and daily streaks. Review accuracy stats and mastery progression across your entire vocabulary.

### At a Glance

| | |
|---|---|
| **Languages** | English, Spanish, French, German, Italian, Dutch, Polish, Portuguese |
| **CEFR Levels** | A1, A2, B1, B2, C1, C2 |
| **Themes** | Modern, Editorial, Vintage, Cozy, Brutalist, Minimalist |
| **UI Languages** | English, Polish, Spanish |
| **Works Offline** | PWA with IndexedDB storage and offline text queue |
| **TTS** | Microsoft Neural TTS with word-level highlighting |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 8 |
| Styling | Tailwind CSS 4 with CSS custom property themes |
| State | Zustand 5 with IndexedDB persistence |
| i18n | i18next + react-i18next |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL 16 (optional — runs without it) |
| AI | DeepSeek API |
| TTS | Microsoft Edge TTS (via node-edge-tts) |
| PWA | vite-plugin-pwa with service worker |

## Getting Started

### Prerequisites

- Node.js 20+
- A [DeepSeek API key](https://platform.deepseek.com/)
- PostgreSQL 16 (optional)

### Quick Start

```bash
git clone https://github.com/pablocaeg/polyglot.git
cd polyglot
npm install
cp .env.example .env
```

Open `.env` and paste your DeepSeek API key:

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — that's it. The Vite dev server handles API calls through built-in middleware, so no separate backend process is needed.

> **No API key yet?** Get one free at [platform.deepseek.com](https://platform.deepseek.com/). The free tier is generous enough for personal use.

### Production

```bash
npm run build    # TypeScript check + Vite build
npm run server   # Start Express server (serves from dist/)
```

Or combined: `npm start`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | API key for text generation, translation, and AI chat |
| `DATABASE_URL` | No | PostgreSQL connection string for instant lookups |
| `VITE_API_URL` | No | API base URL (leave empty when frontend and backend share the same origin) |
| `PORT` | No | Server port (default: 3000) |
| `CORS_ORIGIN` | No | CORS origin (default: allows all) |

## Project Structure

```
src/
├── components/     # React components (UI, reader, practice, settings)
├── routes/         # Page components (Home, TextReader, Practice, Stats, Settings)
├── stores/         # Zustand stores (settings, texts, words, activity, gamification, theme)
├── services/       # API client, IndexedDB storage, LLM prompts, TTS
├── hooks/          # Custom hooks (speech, text selection)
├── utils/          # Pure functions (SM-2 algorithm, gamification, tokenizer)
├── types/          # TypeScript type definitions
└── i18n/           # Locale files (en, pl, es)

server/
├── index.ts        # Express entry point
├── routes/         # API route handlers
├── lib/            # DeepSeek client, constants
├── db.ts           # PostgreSQL connection pool
└── middleware.ts   # Rate limiting, CORS

scripts/
├── schema.sql      # Database schema
├── dict/           # Dictionary pipeline scripts
└── gen/            # Text generation pipeline scripts

docs/
└── AGENTS.md       # AI agent suite documentation

.claude/
└── agents/         # 12 Claude Code agents for autonomous contribution
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR and API middleware |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run server` | Start the Express production server |
| `npm start` | Build + start server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `make help` | Show all available Makefile targets |

## AI Agents (Claude Code)

This project includes 12 specialized [Claude Code](https://claude.ai/claude-code) agents that can autonomously navigate, build, test, review, and create PRs for the project. They live in `.claude/agents/` and are available to anyone using Claude Code.

```
# Explore the codebase
/agent polyglot-expert "How does the spaced repetition system work?"

# Make a complete contribution (orchestrates all agents)
/agent polyglot-contribute "Add French as a fourth UI language"

# Review changes before submitting
/agent polyglot-reviewer
```

See **[docs/AGENTS.md](docs/AGENTS.md)** for the full agent reference, pipeline diagram, and example workflows.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and how to submit changes.

## License

[MIT](LICENSE)
