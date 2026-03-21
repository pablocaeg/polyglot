import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Connect } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Make .env variables available on process.env for server middleware
  Object.assign(process.env, env)

  return {
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Polyglot',
        short_name: 'Polyglot',
        description: 'Language learning app',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    {
      name: 'api-proxy',
      configureServer(server) {
        /* ── Text generation endpoint ─────────────── */
        server.middlewares.use('/api/generate', (async (
          req: Connect.IncomingMessage,
          res: any,
          _next: Connect.NextFunction
        ) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            const { buildTextPrompt } = await import('./src/services/prompts')
            const { systemPrompt, userPrompt } = buildTextPrompt(
              body.direction,
              body.skillLevel,
              body.topic,
              body.category
            )

            const apiKey = process.env.DEEPSEEK_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }))
              return
            }

            const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                response_format: { type: 'json_object' },
              }),
            })

            if (!apiRes.ok) {
              const errText = await apiRes.text()
              res.statusCode = apiRes.status
              res.end(errText)
              return
            }

            const data: any = await apiRes.json()
            const content = data.choices?.[0]?.message?.content
            if (!content) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Empty response from DeepSeek' }))
              return
            }

            const parsed = JSON.parse(content)
            parsed.wordTranslations = parsed.wordTranslations || []

            // Validate minimum length — if too short, ask for more
            const langNames: Record<string, string> = { pl: 'Polish', es: 'Spanish', en: 'English', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese' }
            const targetLang = langNames[body.direction?.target] || 'target language'
            const wordCount = (parsed.content || '').split(/\s+/).length
            const minWords: Record<string, number> = { A1: 20, A2: 40, B1: 60, B2: 80, C1: 100, C2: 120 }
            const required = minWords[body.skillLevel] || 40

            if (wordCount < required && parsed.content) {
              // Ask DeepSeek to expand it
              try {
                const expandRes = await fetch('https://api.deepseek.com/chat/completions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                  body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: `The following ${targetLang} text is too short (${wordCount} words, need at least ${required}). Expand it to meet the requirement while keeping the same topic, style, and level. Keep the same title.\n\nOriginal: "${parsed.content}"\n\nRespond with the same JSON format:\n{"title":"...","content":"expanded text","fullTranslation":"expanded translation"}` },
                    ],
                    temperature: 0.7,
                    response_format: { type: 'json_object' },
                  }),
                })
                if (expandRes.ok) {
                  const expandData: any = await expandRes.json()
                  const expanded = expandData.choices?.[0]?.message?.content
                  if (expanded) {
                    const expandedParsed = JSON.parse(expanded)
                    if ((expandedParsed.content || '').split(/\s+/).length > wordCount) {
                      expandedParsed.wordTranslations = []
                      res.setHeader('Content-Type', 'application/json')
                      res.end(JSON.stringify(expandedParsed))
                      return
                    }
                  }
                }
              } catch {}
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        }) as Connect.NextHandleFunction)

        /* ── Vocabulary extraction (phase 2) ────────── */
        server.middlewares.use('/api/vocab', (async (
          req: Connect.IncomingMessage,
          res: any,
          _next: Connect.NextFunction
        ) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            const textContent = String(body.content || '').slice(0, 5000)
            if (!textContent) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing content' }))
              return
            }

            const { buildVocabPrompt } = await import('./src/services/prompts')
            const { systemPrompt, userPrompt } = buildVocabPrompt(
              body.direction,
              body.skillLevel,
              textContent
            )

            const apiKey = process.env.DEEPSEEK_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }))
              return
            }

            const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' },
              }),
            })

            if (!apiRes.ok) {
              const errText = await apiRes.text()
              res.statusCode = apiRes.status
              res.end(errText)
              return
            }

            const data: any = await apiRes.json()
            const content = data.choices?.[0]?.message?.content
            if (!content) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Empty response' }))
              return
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(content)
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        }) as Connect.NextHandleFunction)

        /* ── Quick word translate endpoint ────────── */
        server.middlewares.use('/api/translate', (async (
          req: Connect.IncomingMessage,
          res: any,
          _next: Connect.NextFunction
        ) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            const word = String(body.word || '').slice(0, 100)
            const fromLang = String(body.fromLang || '')
            const toLang = String(body.toLang || '')
            const context = String(body.context || '').slice(0, 300)

            if (!word || !fromLang || !toLang) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing word, fromLang, or toLang' }))
              return
            }

            const langNames: Record<string, string> = {
              pl: 'Polish', es: 'Spanish', en: 'English',
              fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
            }

            const apiKey = process.env.DEEPSEEK_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }))
              return
            }

            const toName = langNames[toLang] || toLang
            const fromName = langNames[fromLang] || fromLang

            const prompt = context
              ? `Translate the ${fromName} word "${word}" to ${toName}. It appears in this context: "${context}". Write the "translation" and "grammar" fields in ${toName}. Respond with JSON only: {"translation":"translation in ${toName}","pos":"noun/verb/adj/adv/prep/conj/pron/art/num/interj","grammar":"brief grammar note in ${toName}"}`
              : `Translate the ${fromName} word "${word}" to ${toName}. Write the "translation" and "grammar" fields in ${toName}. Respond with JSON only: {"translation":"translation in ${toName}","pos":"noun/verb/adj/adv/prep/conj/pron/art/num/interj","grammar":"brief grammar note in ${toName}"}`

            const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: `You are a precise ${fromName}-${toName} dictionary. Write all text in ${toName}. Respond with valid JSON only, no markdown.` },
                  { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 100,
                response_format: { type: 'json_object' },
              }),
            })

            if (!apiRes.ok) {
              const errText = await apiRes.text()
              res.statusCode = apiRes.status
              res.end(errText)
              return
            }

            const data: any = await apiRes.json()
            const content = data.choices?.[0]?.message?.content
            if (!content) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Empty response' }))
              return
            }

            res.setHeader('Content-Type', 'application/json')
            res.end(content)
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        }) as Connect.NextHandleFunction)

        /* ── Word AI Chat endpoint (streaming) ────── */
        server.middlewares.use('/api/chat', (async (
          req: Connect.IncomingMessage,
          res: any,
          _next: Connect.NextFunction
        ) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            // ── Validate inputs ──
            if (!Array.isArray(body.messages) || body.messages.length === 0) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid messages' }))
              return
            }

            const word = String(body.word || '').slice(0, 100)
            const translation = String(body.translation || '').slice(0, 200)
            const pos = body.pos ? String(body.pos).slice(0, 20) : undefined
            const context = String(body.context || '').slice(0, 500)

            if (!word) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing word' }))
              return
            }

            // Sanitize messages: limit count, enforce roles, cap lengths
            const sanitized = body.messages.slice(-10).map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
              content: m.role === 'assistant'
                ? String(m.content || '').slice(0, 2000)
                : String(m.content || '').slice(0, 200),
            }))

            if (sanitized[sanitized.length - 1].role !== 'user') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Last message must be from user' }))
              return
            }

            const { buildChatSystemPrompt } = await import('./src/services/chatPrompts')
            const systemPrompt = buildChatSystemPrompt(
              body.direction,
              body.skillLevel,
              word,
              translation,
              pos,
              context
            )

            const apiKey = process.env.DEEPSEEK_API_KEY
            if (!apiKey) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }))
              return
            }

            const apiRes = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  ...sanitized,
                ],
                temperature: 0.7,
                max_tokens: 300,
                stream: true,
              }),
            })

            if (!apiRes.ok) {
              const errText = await apiRes.text()
              res.statusCode = apiRes.status
              res.end(errText)
              return
            }

            // Stream SSE response through
            res.setHeader('Content-Type', 'text/event-stream')
            res.setHeader('Cache-Control', 'no-cache')
            res.setHeader('Connection', 'keep-alive')

            const reader = (apiRes.body as ReadableStream<Uint8Array>).getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) {
                  res.end()
                  break
                }
                res.write(Buffer.from(value))
              }
            } catch {
              res.end()
            }
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        }) as Connect.NextHandleFunction)

        /* ── TTS endpoint (edge-tts) ───────────────── */
        server.middlewares.use('/api/tts', (async (
          req: Connect.IncomingMessage,
          res: any,
          _next: Connect.NextFunction
        ) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = JSON.parse(Buffer.concat(chunks).toString())

            const text = String(body.text || '').slice(0, 2000)
            const lang = String(body.lang || 'pl')
            const rate = String(body.rate || '-10%')

            if (!text) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing text' }))
              return
            }

            const voiceMap: Record<string, string> = {
              pl: 'pl-PL-ZofiaNeural',
              es: 'es-ES-ElviraNeural',
              en: 'en-US-JennyNeural',
              fr: 'fr-FR-DeniseNeural',
              de: 'de-DE-KatjaNeural',
              it: 'it-IT-ElsaNeural',
              pt: 'pt-PT-RaquelNeural',
            }
            const voice = voiceMap[lang] || voiceMap['pl']

            const { EdgeTTS } = await import('node-edge-tts')
            const { tmpdir } = await import('os')
            const { join } = await import('path')
            const { readFile, unlink } = await import('fs/promises')
            const { randomUUID } = await import('crypto')

            const tmpPath = join(tmpdir(), `polyglot-tts-${randomUUID()}.mp3`)

            const tts = new EdgeTTS({
              voice,
              outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              rate,
              saveSubtitles: true,
              timeout: 15000,
            })

            // Race against a timeout to avoid hanging requests
            await Promise.race([
              tts.ttsPromise(text, tmpPath),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TTS generation timed out')), 20000)
              ),
            ])

            const audioBuffer = await readFile(tmpPath)

            // Read word-level timing cues
            const cuesPath = tmpPath + '.json'
            let cues: { text: string; start: number; end: number }[] = []
            try {
              const raw = await readFile(cuesPath, 'utf8')
              const parsed = JSON.parse(raw) as { part: string; start: number; end: number }[]
              cues = parsed.map((c) => ({
                text: c.part.trim(),
                start: c.start / 1000,
                end: c.end / 1000,
              }))
              unlink(cuesPath).catch(() => {})
            } catch {}
            unlink(tmpPath).catch(() => {})

            // Return JSON with base64 audio + cues
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              audio: audioBuffer.toString('base64'),
              cues,
            }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        }) as Connect.NextHandleFunction)
      },
    },
  ],
  }
})
