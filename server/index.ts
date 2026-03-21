/**
 * Polyglot production backend.
 *
 * Serves the static frontend (dist/) and API endpoints.
 * Uses PostgreSQL for instant lookups, falling back to DeepSeek LLM.
 *
 * Deploy: node --import tsx server/index.ts
 *
 * Env: DEEPSEEK_API_KEY (required), DATABASE_URL (optional), PORT, CORS_ORIGIN
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyMiddleware } from './middleware.js'
import { getPool, close } from './db.js'

import generateRoutes from './routes/generate.js'
import translateRoutes from './routes/translate.js'
import vocabRoutes from './routes/vocab.js'
import chatRoutes from './routes/chat.js'
import ttsRoutes from './routes/tts.js'
import healthRoutes from './routes/health.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT || '3000', 10)

if (!process.env.DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY environment variable is required')
  process.exit(1)
}

/* ── App setup ────────────────────────────────── */

const app = express()
applyMiddleware(app)

/* ── API routes ───────────────────────────────── */

app.use(generateRoutes)
app.use(translateRoutes)
app.use(vocabRoutes)
app.use(chatRoutes)
app.use(ttsRoutes)
app.use(healthRoutes)

/* ── Static frontend ──────────────────────────── */

const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

/* ── Start ────────────────────────────────────── */

const server = app.listen(PORT, '0.0.0.0', () => {
  const dbStatus = getPool() ? 'connected' : 'not configured (LLM-only mode)'
  console.log(`Polyglot server running on http://0.0.0.0:${PORT}`)
  console.log(`Database: ${dbStatus}`)
})

const shutdown = async () => {
  console.log('Shutting down...')
  server.close()
  await close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
