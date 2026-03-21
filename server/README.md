# Polyglot Backend — Hetzner Deployment Guide

## What is this?

Polyglot is a language learning app supporting 7 languages (Polish, Spanish, English, French, German, Italian, Portuguese). Users read AI-generated texts, tap words for instant translations, chat with an AI tutor, and practice with flashcards/quizzes using spaced repetition.

The backend serves two purposes:
1. **API server** — Express endpoints for text generation, word translation, vocabulary extraction, AI chat, and TTS
2. **Static host** — serves the built React frontend from `dist/`

### Architecture

```
Client (browser)
  │
  ├─ /api/generate    → DB lookup (pre-generated texts) → DeepSeek LLM fallback
  ├─ /api/translate   → DB lookup (dictionary)          → DeepSeek LLM fallback
  ├─ /api/vocab       → DB bulk lookup (dictionary)     → DeepSeek LLM fallback
  ├─ /api/chat        → DeepSeek LLM (streaming SSE, always live)
  ├─ /api/tts         → edge-tts (Microsoft Neural TTS)
  ├─ /api/health      → DB status + counts
  └─ /*               → static files (React SPA)
```

**Key design**: every endpoint works without a database (LLM-only mode). Adding PostgreSQL makes translations instant (~5ms) and text serving instant (~50ms) instead of 2-8s LLM calls.

### File structure

```
server/
  index.ts              Entry point — middleware, route registration, startup
  db.ts                 PostgreSQL connection pool (graceful if no DB)
  middleware.ts          Rate limiters (AI: 20/min, DB: 120/min) + CORS
  lib/
    deepseek.ts         DeepSeek API client (JSON + streaming)
    constants.ts        Language names, TTS voice map
  routes/
    generate.ts         POST /api/generate — serve pre-generated text or call LLM
    translate.ts        POST /api/translate — dictionary lookup or call LLM (caches result)
    vocab.ts            POST /api/vocab — bulk word translation for a text
    chat.ts             POST /api/chat — streaming AI word explanations
    tts.ts              POST /api/tts — text-to-speech via edge-tts
    health.ts           GET /api/health, GET /api/texts/count
```

---

## Server Requirements

- **OS**: Ubuntu 22.04+ (or Debian 12+)
- **Node.js**: 22 LTS
- **PostgreSQL**: 16
- **Caddy**: reverse proxy with automatic TLS
- **PM2**: process manager for Node.js

---

## Setup (fresh Hetzner server)

### 1. System packages

```bash
# Update system
apt update && apt upgrade -y

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# PostgreSQL 16
apt install -y postgresql-16 postgresql-client-16

# Caddy (auto-TLS reverse proxy)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# PM2 (process manager)
npm install -g pm2
```

### 2. PostgreSQL setup

```bash
sudo -u postgres psql <<EOF
CREATE USER polyglot WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE polyglot OWNER polyglot;
GRANT ALL PRIVILEGES ON DATABASE polyglot TO polyglot;
EOF

# Create tables
sudo -u postgres psql -d polyglot < /opt/polyglot/scripts/schema.sql
```

### 3. Deploy the app

```bash
# Clone/copy repo to /opt/polyglot
mkdir -p /opt/polyglot
# (git clone or rsync your repo here)

cd /opt/polyglot
npm install --legacy-peer-deps
npm run build
```

### 4. Environment variables

```bash
cat > /opt/polyglot/.env <<EOF
DEEPSEEK_API_KEY=your_key_here
DATABASE_URL=postgresql://polyglot:CHANGE_ME_STRONG_PASSWORD@localhost:5432/polyglot
PORT=3000
EOF
```

### 5. Start with PM2

```bash
cd /opt/polyglot
pm2 start "node --import tsx server/index.ts" --name polyglot
pm2 save
pm2 startup  # auto-start on reboot
```

### 6. Caddy reverse proxy

If using a domain:
```
# /etc/caddy/Caddyfile
yourdomain.com {
    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

If using raw IP (no TLS):
```
# /etc/caddy/Caddyfile
:80 {
    reverse_proxy localhost:3000
}
```

```bash
systemctl restart caddy
```

### 7. Verify

```bash
# Health check
curl http://localhost:3000/api/health

# Should return:
# {"status":"healthy","database":{"ok":true},"texts":0,"dictionaryEntries":0,"uptime":...}
```

---

## Populating the Database

The DB starts empty. Content is built in two pipelines:

### Dictionary pipeline (instant word translations)

Run these in order on the server (or locally, then import the DB):

```bash
cd /opt/polyglot

# 1. Download Wiktionary + FreeDict dumps (~5-10 GB total)
bash scripts/dict/01-download.sh

# 2. Parse Wiktionary (requires Python + wiktextract)
pip install wiktextract
npx tsx scripts/dict/02-parse-wiktionary.ts

# 3. Parse FreeDict TEI-XML
npx tsx scripts/dict/03-parse-freedict.ts

# 4. Merge and deduplicate
npx tsx scripts/dict/04-merge.ts

# 5. Import into PostgreSQL
DATABASE_URL=... npx tsx scripts/dict/05-import.ts

# 6. Fill gaps for common words via LLM
DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/dict/06-gap-fill.ts --limit 1000
```

**Expected result**: ~500K-1M dictionary entries, ~2-5M translations

### Text generation pipeline (instant text serving)

```bash
# Initialize all language/level/category combinations (1,176 jobs × 10 texts each)
DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/generate-texts.ts --init --priority

# Generate texts (start with popular pairs)
DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/generate-texts.ts --priority --limit 100

# Backfill vocabulary for texts missing it
DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/compute-vocabulary.ts

# Validate quality
DATABASE_URL=... npx tsx scripts/gen/validate-texts.ts --verbose
```

**Expected result**: ~11,760 texts across all combos. Cost: ~$25 at DeepSeek rates.

### Daily cron (keep content fresh)

```bash
# Add to crontab: generate 20 new texts daily for lowest-count combos
crontab -e
# 0 3 * * * cd /opt/polyglot && DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/generate-texts.ts --limit 20 >> /var/log/polyglot-gen.log 2>&1
```

---

## API Reference

### POST /api/generate
Generate or serve a reading text.

```json
// Request
{ "direction": {"target": "es", "native": "pl"}, "skillLevel": "beginner", "category": "food" }

// Response
{ "title": "...", "content": "...", "fullTranslation": "...", "wordTranslations": [{...}] }
```

### POST /api/translate
Translate a single word.

```json
// Request
{ "word": "comieron", "fromLang": "es", "toLang": "pl", "context": "Ellos comieron paella" }

// Response
{ "translation": "zjedli", "pos": "verb", "grammar": "3 os. l.mn. czas przeszły od comer" }
```

### POST /api/vocab
Extract vocabulary from a text passage.

```json
// Request
{ "content": "El gato duerme en el jardín.", "direction": {"target": "es", "native": "pl"}, "skillLevel": "beginner" }

// Response
{ "wordTranslations": [{"word": "El", "translation": "ten", "pos": "art", "grammar": "..."}, ...] }
```

### POST /api/chat
Streaming AI word explanations (SSE).

```json
// Request
{ "word": "comieron", "translation": "zjedli", "messages": [{"role": "user", "content": "Odmień ten czasownik"}], "direction": {"target": "es", "native": "pl"}, "skillLevel": "beginner", "context": "sentence" }

// Response: text/event-stream (SSE chunks)
```

### POST /api/tts
Text-to-speech audio generation.

```json
// Request
{ "text": "El gato duerme.", "lang": "es", "rate": "-10%" }

// Response
{ "audio": "base64...", "cues": [{"text": "El", "start": 0.1, "end": 0.3}, ...] }
```

### GET /api/health
Server + DB status.

### GET /api/texts/count?target=es&native=pl&level=beginner
Count available pre-generated texts for a combination.

---

## Operations

### Logs
```bash
pm2 logs polyglot
```

### Restart
```bash
pm2 restart polyglot
```

### Update code
```bash
cd /opt/polyglot
git pull
npm install --legacy-peer-deps
npm run build
pm2 restart polyglot
```

### DB backup
```bash
pg_dump -U polyglot polyglot > backup_$(date +%Y%m%d).sql
```

### Monitor
```bash
# Process status
pm2 status

# Health endpoint
curl -s localhost:3000/api/health | jq .

# Text counts
curl -s "localhost:3000/api/texts/count?target=es&native=pl" | jq .
```
