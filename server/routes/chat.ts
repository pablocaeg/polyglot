import { Router } from 'express'
import { aiLimiter } from '../middleware.js'
import { streamDeepSeek } from '../lib/deepseek.js'
import { buildChatSystemPrompt } from '../../src/services/chatPrompts.js'

const router = Router()

router.post('/api/chat', aiLimiter, async (req, res) => {
  try {
    const { messages, direction, skillLevel, pos, context } = req.body
    const word = String(req.body.word || '').slice(0, 100)
    const translation = String(req.body.translation || '').slice(0, 200)

    if (!word || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Missing word or messages' })
      return
    }

    // Sanitize messages
    const sanitized = messages.slice(-10).map((m: any) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content:
        m.role === 'assistant'
          ? String(m.content || '').slice(0, 2000)
          : String(m.content || '').slice(0, 200),
    }))

    if (sanitized[sanitized.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Last message must be from user' })
      return
    }

    const systemPrompt = buildChatSystemPrompt(
      direction,
      skillLevel,
      word,
      translation,
      pos ? String(pos).slice(0, 20) : undefined,
      String(context || '').slice(0, 500)
    )

    const apiRes = await streamDeepSeek({
      systemPrompt,
      messages: sanitized,
      temperature: 0.7,
      maxTokens: 300,
    })

    if (!apiRes.ok) {
      const errText = await apiRes.text()
      res.status(apiRes.status).send(errText)
      return
    }

    // Stream SSE through
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = (apiRes.body as ReadableStream<Uint8Array>).getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
    } catch {
      // client disconnected
    }
    res.end()
  } catch (e: any) {
    console.error('Chat error:', e.message)
    if (!res.headersSent) {
      res.status(500).json({ error: e.message })
    }
  }
})

export default router
