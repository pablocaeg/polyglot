/**
 * Compute/backfill vocabulary for texts that are missing it.
 *
 * For each text without vocabulary, looks up words in the dictionary
 * and fills gaps via LLM.
 *
 * Usage:
 *   DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/compute-vocabulary.ts
 *
 * Options:
 *   --limit 50   Max texts to process (default: 100)
 *   --db-only    Only use dictionary lookups, skip LLM
 */

import pg from 'pg'

const LANG_NAMES: Record<string, string> = {
  pl: 'Polish', es: 'Spanish', en: 'English',
  fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
}

const RATE_LIMIT_MS = 1500

async function main() {
  const args = process.argv.slice(2)
  const limitArg = getArg(args, '--limit')
  const limit = limitArg ? parseInt(limitArg, 10) : 100
  const dbOnly = args.includes('--db-only')

  const dbUrl = process.env.DATABASE_URL
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1) }
  if (!apiKey && !dbOnly) { console.error('DEEPSEEK_API_KEY required (or use --db-only)'); process.exit(1) }

  const pool = new pg.Pool({ connectionString: dbUrl, max: 5 })
  await pool.query('SELECT 1')

  // Find texts without vocabulary
  const texts = await pool.query(
    `SELECT t.id, t.content, t.target_lang, t.native_lang, t.skill_level, t.title
     FROM texts t
     LEFT JOIN text_vocabulary tv ON tv.text_id = t.id
     WHERE tv.id IS NULL
     ORDER BY t.served_count DESC
     LIMIT $1`,
    [limit]
  )

  console.log(`Texts without vocabulary: ${texts.rows.length}`)

  let processed = 0

  for (const text of texts.rows) {
    console.log(`\n[${processed + 1}/${texts.rows.length}] "${text.title}" (${text.target_lang}→${text.native_lang})`)

    const words = (text.content as string).match(/[\p{L}]+/gu) || []
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))]

    if (uniqueWords.length === 0) {
      console.log('  No words found — skipping')
      continue
    }

    // ── DB lookup ──
    const placeholders = uniqueWords.map((_, i) => `$${i + 3}`).join(', ')
    const dbResult = await pool.query(
      `SELECT de.word, de.pos, t.translation, t.grammar_note AS grammar
       FROM dictionary_entries de
       JOIN translations t ON t.source_entry_id = de.id
       WHERE de.lang = $1 AND de.word IN (${placeholders}) AND t.target_lang = $2
       ORDER BY t.confidence DESC`,
      [text.target_lang, text.native_lang, ...uniqueWords]
    )

    const found = new Map<string, any>()
    for (const row of dbResult.rows) {
      if (!found.has(row.word)) found.set(row.word, row)
    }

    const vocab: Array<{ word: string; translation: string; pos?: string; grammar?: string }> = []
    const missing: string[] = []
    const seen = new Set<string>()

    for (const w of words) {
      const lower = w.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)

      const entry = found.get(lower)
      if (entry) {
        vocab.push({
          word: w,
          translation: entry.translation,
          pos: entry.pos || undefined,
          grammar: entry.grammar || undefined,
        })
      } else {
        missing.push(w)
      }
    }

    console.log(`  DB: ${found.size}/${uniqueWords.length} words | Missing: ${missing.length}`)

    // ── LLM fallback for missing words ──
    if (missing.length > 0 && !dbOnly && apiKey) {
      try {
        const targetLang = LANG_NAMES[text.target_lang]
        const nativeLang = LANG_NAMES[text.native_lang]

        const prompt = `Translate these ${targetLang} words to ${nativeLang} for a ${text.skill_level} learner:

Words: ${missing.join(', ')}

Context: "${(text.content as string).slice(0, 500)}"

JSON: {"wordTranslations": [{"word": "exact word", "translation": "${nativeLang} translation", "pos": "noun/verb/adj/etc", "grammar": "brief note"}]}`

        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: `You are a ${targetLang}-${nativeLang} dictionary. Valid JSON only.` },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        })

        if (res.ok) {
          const data: any = await res.json()
          const content = data.choices?.[0]?.message?.content
          if (content) {
            const parsed = JSON.parse(content)
            if (Array.isArray(parsed.wordTranslations)) {
              for (const wt of parsed.wordTranslations) {
                if (wt.word && wt.translation) {
                  vocab.push({
                    word: wt.word,
                    translation: wt.translation,
                    pos: wt.pos || undefined,
                    grammar: wt.grammar || undefined,
                  })
                }
              }
            }
          }
        }

        await sleep(RATE_LIMIT_MS)
      } catch (err: any) {
        console.warn(`  LLM error: ${err.message}`)
      }
    }

    // ── Insert vocabulary ──
    if (vocab.length > 0) {
      for (let i = 0; i < vocab.length; i++) {
        const v = vocab[i]
        await pool.query(
          `INSERT INTO text_vocabulary (text_id, word, word_lower, translation, pos, grammar, word_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (text_id, word_lower, pos) DO NOTHING`,
          [text.id, v.word, v.word.toLowerCase(), v.translation, v.pos || null, v.grammar || null, i]
        )
      }
      console.log(`  Saved ${vocab.length} vocabulary entries`)
    }

    processed++
  }

  console.log(`\nDone. Processed ${processed} texts.`)
  await pool.end()
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(console.error)
