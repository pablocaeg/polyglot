import { Router } from 'express'
import { aiLimiter } from '../middleware.js'
import { callDeepSeek } from '../lib/deepseek.js'
import { query, getPool } from '../db.js'
import { buildPrompt } from '../../src/services/prompts.js'

const router = Router()

router.post('/api/generate', aiLimiter, async (req, res) => {
  try {
    const { direction, skillLevel, topic, category } = req.body

    if (!direction?.target || !direction?.native || !skillLevel) {
      res.status(400).json({ error: 'Missing direction or skillLevel' })
      return
    }

    // ── Try DB first ──
    const db = getPool()
    if (db) {
      try {
        const result = await query(
          `SELECT t.id, t.title, t.content, t.full_translation,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'word', tv.word,
                        'translation', tv.translation,
                        'pos', tv.pos,
                        'grammar', tv.grammar
                      ) ORDER BY tv.word_order
                    ) FILTER (WHERE tv.id IS NOT NULL),
                    '[]'::json
                  ) AS word_translations
           FROM texts t
           LEFT JOIN text_vocabulary tv ON tv.text_id = t.id
           WHERE t.target_lang = $1
             AND t.native_lang = $2
             AND t.skill_level = $3
             ${category ? 'AND t.category = $4' : ''}
           GROUP BY t.id
           ORDER BY t.served_count ASC, RANDOM()
           LIMIT 1`,
          category
            ? [direction.target, direction.native, skillLevel, category]
            : [direction.target, direction.native, skillLevel]
        )

        if (result && result.rows.length > 0) {
          const row = result.rows[0]
          query('UPDATE texts SET served_count = served_count + 1 WHERE id = $1', [row.id])

          res.json({
            title: row.title,
            content: row.content,
            fullTranslation: row.full_translation,
            wordTranslations: row.word_translations,
          })
          return
        }
      } catch (dbErr: any) {
        console.warn('DB generate lookup failed, falling back to LLM:', dbErr.message)
      }
    }

    // ── Fallback to LLM ──
    const { systemPrompt, userPrompt } = buildPrompt(direction, skillLevel, topic, category)
    const content = await callDeepSeek({ systemPrompt, userPrompt })

    res.setHeader('Content-Type', 'application/json')
    res.send(content)
  } catch (e: any) {
    console.error('Generate error:', e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
})

export default router
