import { Router } from 'express'
import { dbLimiter } from '../middleware.js'
import { callDeepSeek } from '../lib/deepseek.js'
import { query, getPool } from '../db.js'

const router = Router()

router.post('/api/vocab', dbLimiter, async (req, res) => {
  try {
    const textContent = String(req.body.content || '').slice(0, 5000)
    const { direction, skillLevel } = req.body

    if (!textContent) {
      res.status(400).json({ error: 'Missing content' })
      return
    }

    // ── Try bulk DB lookup ──
    const db = getPool()
    if (db && direction?.target && direction?.native) {
      try {
        const words: string[] = textContent.match(/[\p{L}]+/gu) || []
        const uniqueLower = [...new Set(words.map((w: string) => w.toLowerCase()))]

        if (uniqueLower.length > 0) {
          const placeholders = uniqueLower.map((_, i) => `$${i + 3}`).join(', ')
          const result = await query(
            `SELECT de.word, de.word_display, de.pos, t.translation, t.grammar_note AS grammar
             FROM dictionary_entries de
             JOIN translations t ON t.source_entry_id = de.id
             WHERE de.lang = $1
               AND de.word IN (${placeholders})
               AND t.target_lang = $2
             ORDER BY t.confidence DESC`,
            [direction.target, direction.native, ...uniqueLower]
          )

          if (result && result.rows.length > 0) {
            const found = new Map<string, any>()
            for (const row of result.rows) {
              if (!found.has(row.word)) {
                found.set(row.word, row)
              }
            }

            const coverage = found.size / uniqueLower.length
            if (coverage >= 0.6) {
              const seen = new Set<string>()
              const wordTranslations = words
                .map((w: string) => {
                  const key = w.toLowerCase()
                  if (seen.has(key)) return null
                  seen.add(key)
                  const entry = found.get(key)
                  if (!entry) return null
                  return {
                    word: w,
                    translation: entry.translation,
                    pos: entry.pos || undefined,
                    grammar: entry.grammar || undefined,
                  }
                })
                .filter(Boolean)

              res.json({ wordTranslations })
              return
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('DB vocab lookup failed, falling back to LLM:', dbErr.message)
      }
    }

    // ── Fallback to LLM ──
    const { buildVocabPrompt } = await import('../../src/services/prompts.js')
    const { systemPrompt, userPrompt } = buildVocabPrompt(direction, skillLevel, textContent)

    const content = await callDeepSeek({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    })

    res.setHeader('Content-Type', 'application/json')
    res.send(content)
  } catch (e: any) {
    console.error('Vocab error:', e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
})

export default router
