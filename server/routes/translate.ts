import { Router } from 'express'
import { dbLimiter } from '../middleware.js'
import { callDeepSeek } from '../lib/deepseek.js'
import { query, getPool } from '../db.js'
import { LANG_NAMES } from '../lib/constants.js'

const router = Router()

router.post('/api/translate', dbLimiter, async (req, res) => {
  try {
    const word = String(req.body.word || '').slice(0, 100)
    const fromLang = String(req.body.fromLang || '')
    const toLang = String(req.body.toLang || '')
    const context = String(req.body.context || '').slice(0, 300)

    if (!word || !fromLang || !toLang) {
      res.status(400).json({ error: 'Missing word, fromLang, or toLang' })
      return
    }

    // ── Try DB: exact match ──
    const db = getPool()
    if (db) {
      try {
        let result = await query(
          `SELECT de.pos, t.translation, t.grammar_note AS grammar
           FROM dictionary_entries de
           JOIN translations t ON t.source_entry_id = de.id
           WHERE de.lang = $1
             AND de.word = $2
             AND t.target_lang = $3
           ORDER BY t.confidence DESC, de.frequency ASC NULLS LAST
           LIMIT 1`,
          [fromLang, word.toLowerCase(), toLang]
        )

        // Lemma fallback
        if (!result || result.rows.length === 0) {
          result = await query(
            `SELECT de.pos, t.translation, t.grammar_note AS grammar
             FROM dictionary_entries de
             JOIN translations t ON t.source_entry_id = de.id
             WHERE de.lang = $1
               AND de.lemma = $2
               AND t.target_lang = $3
             ORDER BY t.confidence DESC, de.frequency ASC NULLS LAST
             LIMIT 1`,
            [fromLang, word.toLowerCase(), toLang]
          )
        }

        if (result && result.rows.length > 0) {
          const row = result.rows[0]
          res.json({
            translation: row.translation,
            pos: row.pos || undefined,
            grammar: row.grammar || undefined,
          })
          return
        }
      } catch (dbErr: any) {
        console.warn('DB translate lookup failed, falling back to LLM:', dbErr.message)
      }
    }

    // ── Fallback to LLM ──
    const toName = LANG_NAMES[toLang] || toLang
    const fromName = LANG_NAMES[fromLang] || fromLang

    const prompt = context
      ? `Translate the ${fromName} word "${word}" to ${toName}. It appears in this context: "${context}". Write the "translation" and "grammar" fields in ${toName}. Respond with JSON only: {"translation":"translation in ${toName}","pos":"noun/verb/adj/adv/prep/conj/pron/art/num/interj","grammar":"brief grammar note in ${toName}"}`
      : `Translate the ${fromName} word "${word}" to ${toName}. Write the "translation" and "grammar" fields in ${toName}. Respond with JSON only: {"translation":"translation in ${toName}","pos":"noun/verb/adj/adv/prep/conj/pron/art/num/interj","grammar":"brief grammar note in ${toName}"}`

    const content = await callDeepSeek({
      systemPrompt: `You are a precise ${fromName}-${toName} dictionary. Write all text in ${toName}. Respond with valid JSON only, no markdown.`,
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 100,
    })

    // Cache LLM result in DB
    if (db) {
      try {
        const parsed = JSON.parse(content)
        const entryResult = await query(
          `INSERT INTO dictionary_entries (lang, word, word_display, pos)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (lang, word, pos) DO UPDATE SET word_display = EXCLUDED.word_display
           RETURNING id`,
          [fromLang, word.toLowerCase(), word, parsed.pos || null]
        )
        if (entryResult && entryResult.rows.length > 0) {
          await query(
            `INSERT INTO translations (source_entry_id, target_lang, translation, grammar_note, source, confidence)
             VALUES ($1, $2, $3, $4, 'llm', 0.7)
             ON CONFLICT (source_entry_id, target_lang, translation) DO NOTHING`,
            [entryResult.rows[0].id, toLang, parsed.translation, parsed.grammar || null]
          )
        }
      } catch {
        // Non-critical
      }
    }

    res.setHeader('Content-Type', 'application/json')
    res.send(content)
  } catch (e: any) {
    console.error('Translate error:', e.message)
    res.status(e.status || 500).json({ error: e.message })
  }
})

export default router
