/**
 * Batch text generation — pre-generates texts for all language/level/category combos.
 *
 * Reads pending generation_jobs from the DB and generates texts using DeepSeek.
 * For vocabulary: first attempts dictionary lookup, then falls back to LLM.
 *
 * Usage:
 *   DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/gen/generate-texts.ts
 *
 * Options:
 *   --target es      Only generate for target language 'es'
 *   --native pl      Only generate for native language 'pl'
 *   --level beginner Only generate for this skill level
 *   --limit 10       Max texts to generate per run (default: unlimited)
 *   --init           Initialize generation_jobs table with all combos
 *   --priority       Generate popular pairs first (es↔pl, es↔en, en↔pl)
 */

import pg from 'pg'

const LANGS = ['pl', 'es', 'en', 'fr', 'de', 'it', 'pt'] as const
const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const
const CATEGORIES = ['culture', 'food', 'travel', 'news', 'stories', 'daily-life', 'other'] as const

const LANG_NAMES: Record<string, string> = {
  pl: 'Polish', es: 'Spanish', en: 'English',
  fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
}

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  beginner: 'A1-A2 level. Use very simple vocabulary (most common 500 words), short sentences (5-8 words), present tense only. Write 6-8 sentences (at least 50 words total).',
  intermediate: 'B1 level. Use common vocabulary (1500 words), compound sentences, past and future tenses. Write 8-10 sentences (at least 80 words total).',
  advanced: 'B2-C1 level. Use rich vocabulary including idioms and colloquial expressions, complex grammar, subjunctive mood where appropriate. Write 10-14 sentences (at least 120 words total).',
  expert: 'C2 level. Use sophisticated vocabulary, literary expressions, complex nested sentences, nuanced grammar. Write 14-18 sentences (at least 160 words total).',
}

// Priority pairs (generate these first)
const PRIORITY_PAIRS = [
  ['es', 'pl'], ['pl', 'es'],
  ['es', 'en'], ['en', 'es'],
  ['en', 'pl'], ['pl', 'en'],
]

const RATE_LIMIT_MS = 1500 // DeepSeek rate limit buffer

async function main() {
  const args = process.argv.slice(2)
  const targetFilter = getArg(args, '--target')
  const nativeFilter = getArg(args, '--native')
  const levelFilter = getArg(args, '--level')
  const limitArg = getArg(args, '--limit')
  const limit = limitArg ? parseInt(limitArg, 10) : Infinity
  const shouldInit = args.includes('--init')
  const usePriority = args.includes('--priority')

  const dbUrl = process.env.DATABASE_URL
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1) }
  if (!apiKey) { console.error('DEEPSEEK_API_KEY required'); process.exit(1) }

  const pool = new pg.Pool({ connectionString: dbUrl, max: 5 })
  await pool.query('SELECT 1')
  console.log('Connected to PostgreSQL')

  // ── Initialize jobs table if requested ──
  if (shouldInit) {
    console.log('Initializing generation_jobs...')
    let jobCount = 0

    for (const target of LANGS) {
      for (const native of LANGS) {
        if (target === native) continue
        if (targetFilter && target !== targetFilter) continue
        if (nativeFilter && native !== nativeFilter) continue

        for (const level of LEVELS) {
          if (levelFilter && level !== levelFilter) continue

          for (const category of CATEGORIES) {
            await pool.query(
              `INSERT INTO generation_jobs (target_lang, native_lang, skill_level, category, target_count)
               VALUES ($1, $2, $3, $4, 10)
               ON CONFLICT (target_lang, native_lang, skill_level, category) DO NOTHING`,
              [target, native, level, category]
            )
            jobCount++
          }
        }
      }
    }
    console.log(`  Created/verified ${jobCount} generation jobs`)
  }

  // ── Process pending jobs ──
  let generated = 0

  // Build job query with optional priority ordering
  let orderClause = 'ORDER BY gj.completed_count ASC'
  if (usePriority) {
    const priorityCases = PRIORITY_PAIRS.map(
      ([t, n], i) => `WHEN gj.target_lang = '${t}' AND gj.native_lang = '${n}' THEN ${i}`
    ).join(' ')
    orderClause = `ORDER BY CASE ${priorityCases} ELSE 100 END, gj.completed_count ASC`
  }

  let whereClause = `WHERE gj.status != 'done' AND gj.completed_count < gj.target_count`
  const queryParams: unknown[] = []
  let paramIdx = 1

  if (targetFilter) { whereClause += ` AND gj.target_lang = $${paramIdx++}`; queryParams.push(targetFilter) }
  if (nativeFilter) { whereClause += ` AND gj.native_lang = $${paramIdx++}`; queryParams.push(nativeFilter) }
  if (levelFilter) { whereClause += ` AND gj.skill_level = $${paramIdx++}`; queryParams.push(levelFilter) }

  const jobs = await pool.query(
    `SELECT gj.* FROM generation_jobs gj ${whereClause} ${orderClause}`,
    queryParams
  )

  console.log(`\nPending jobs: ${jobs.rows.length}`)

  for (const job of jobs.rows) {
    if (generated >= limit) {
      console.log(`\nReached limit of ${limit} texts`)
      break
    }

    const remaining = job.target_count - job.completed_count
    console.log(`\n--- ${LANG_NAMES[job.target_lang]} → ${LANG_NAMES[job.native_lang]} | ${job.skill_level} | ${job.category} (${job.completed_count}/${job.target_count}) ---`)

    // Mark job as running
    await pool.query(
      `UPDATE generation_jobs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [job.id]
    )

    for (let i = 0; i < remaining && generated < limit; i++) {
      try {
        // ── Generate text ──
        const direction = { target: job.target_lang, native: job.native_lang }
        const { systemPrompt, userPrompt } = buildTextPrompt(
          direction, job.skill_level, undefined, job.category
        )

        const textContent = await callDeepSeek(apiKey, systemPrompt, userPrompt)
        const parsed = JSON.parse(textContent)

        if (!parsed.title || !parsed.content || !parsed.fullTranslation) {
          console.log(`  [${i + 1}] Invalid response — skipping`)
          continue
        }

        const wordCount = parsed.content.split(/\s+/).length

        // ── Insert text ──
        const textResult = await pool.query(
          `INSERT INTO texts (target_lang, native_lang, skill_level, category, title, content, full_translation, word_count, generated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'deepseek')
           ON CONFLICT (target_lang, native_lang, content) DO NOTHING
           RETURNING id`,
          [job.target_lang, job.native_lang, job.skill_level, job.category,
           parsed.title, parsed.content, parsed.fullTranslation, wordCount]
        )

        if (textResult.rows.length === 0) {
          console.log(`  [${i + 1}] Duplicate content — skipping`)
          continue
        }

        const textId = textResult.rows[0].id

        // ── Generate vocabulary ──
        const vocab = await generateVocabulary(
          pool, apiKey, parsed.content, direction, job.skill_level
        )

        // Insert vocabulary
        if (vocab.length > 0) {
          for (let vi = 0; vi < vocab.length; vi++) {
            const v = vocab[vi]
            await pool.query(
              `INSERT INTO text_vocabulary (text_id, word, word_lower, translation, pos, grammar, word_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (text_id, word_lower, pos) DO NOTHING`,
              [textId, v.word, v.word.toLowerCase(), v.translation, v.pos || null, v.grammar || null, vi]
            )
          }
        }

        // Update job progress
        await pool.query(
          `UPDATE generation_jobs SET completed_count = completed_count + 1 WHERE id = $1`,
          [job.id]
        )

        generated++
        console.log(`  [${i + 1}] "${parsed.title}" (${wordCount} words, ${vocab.length} vocab)`)
        await sleep(RATE_LIMIT_MS)
      } catch (err: any) {
        console.error(`  [${i + 1}] Error: ${err.message}`)
        await sleep(3000)
      }
    }

    // Mark job done if complete
    const updated = await pool.query(
      `SELECT completed_count, target_count FROM generation_jobs WHERE id = $1`,
      [job.id]
    )
    if (updated.rows[0]?.completed_count >= updated.rows[0]?.target_count) {
      await pool.query(
        `UPDATE generation_jobs SET status = 'done', completed_at = NOW() WHERE id = $1`,
        [job.id]
      )
    } else {
      await pool.query(
        `UPDATE generation_jobs SET status = 'pending' WHERE id = $1`,
        [job.id]
      )
    }
  }

  // ── Summary ──
  const [textCount, vocabCount] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM texts'),
    pool.query('SELECT COUNT(*)::int AS count FROM text_vocabulary'),
  ])
  console.log(`\n=== Summary ===`)
  console.log(`  Texts generated this run: ${generated}`)
  console.log(`  Total texts in DB: ${textCount.rows[0].count}`)
  console.log(`  Total vocabulary entries: ${vocabCount.rows[0].count}`)

  await pool.end()
}

/** Generate vocabulary for a text, using DB lookups first, LLM for gaps */
async function generateVocabulary(
  pool: pg.Pool,
  apiKey: string,
  textContent: string,
  direction: { target: string; native: string },
  skillLevel: string
): Promise<Array<{ word: string; translation: string; pos?: string; grammar?: string }>> {
  // Extract unique words from text
  const words = textContent.match(/[\p{L}]+/gu) || []
  const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))]

  if (uniqueWords.length === 0) return []

  // Try DB lookup first
  const placeholders = uniqueWords.map((_, i) => `$${i + 3}`).join(', ')
  const dbResult = await pool.query(
    `SELECT de.word, de.word_display, de.pos, t.translation, t.grammar_note AS grammar
     FROM dictionary_entries de
     JOIN translations t ON t.source_entry_id = de.id
     WHERE de.lang = $1 AND de.word IN (${placeholders}) AND t.target_lang = $2
     ORDER BY t.confidence DESC`,
    [direction.target, direction.native, ...uniqueWords]
  )

  const found = new Map<string, any>()
  for (const row of dbResult.rows) {
    if (!found.has(row.word)) {
      found.set(row.word, row)
    }
  }

  // Build vocab list from DB matches
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

  // LLM fallback for missing words
  if (missing.length > 0) {
    try {
      const targetLang = LANG_NAMES[direction.target]
      const nativeLang = LANG_NAMES[direction.native]

      const prompt = `Extract translations for these ${targetLang} words (for a ${skillLevel} ${nativeLang} speaker):

Words: ${missing.join(', ')}

Context text: "${textContent.slice(0, 500)}"

Respond with JSON:
{"wordTranslations": [{"word": "exact word", "translation": "${nativeLang} translation", "pos": "noun/verb/adj/etc", "grammar": "brief note in ${nativeLang}"}]}`

      const response = await callDeepSeek(
        apiKey,
        `You are a ${targetLang}-${nativeLang} dictionary. Respond with valid JSON only.`,
        prompt,
        0.3
      )

      const parsed = JSON.parse(response)
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

      await sleep(RATE_LIMIT_MS)
    } catch (err: any) {
      console.warn(`    Vocab LLM fallback error: ${err.message}`)
    }
  }

  return vocab
}

function buildTextPrompt(
  direction: { target: string; native: string },
  skillLevel: string,
  topic?: string,
  category?: string
) {
  const targetLang = LANG_NAMES[direction.target]
  const nativeLang = LANG_NAMES[direction.native]
  const levelDesc = LEVEL_DESCRIPTIONS[skillLevel]

  let topicInstruction = topic
    ? `The text should be about: "${topic}".`
    : 'Choose an interesting, everyday topic (culture, travel, food, daily life, etc.).'

  if (category) {
    topicInstruction += ` The text should fit the category: ${category}.`
  }

  const systemPrompt = `You are a language learning content generator. You create texts in ${targetLang} for ${nativeLang} speakers. Respond with valid JSON only.`

  const userPrompt = `Generate a text in ${targetLang} at this level:
${levelDesc}

${topicInstruction}

IMPORTANT: The text must meet the minimum sentence and word count above. Do not write less.
Each generated text should be unique and different from previous ones — vary topics, vocabulary, and sentence structures.

Respond with this exact JSON:
{
  "title": "Title in ${targetLang}",
  "content": "The full text in ${targetLang}",
  "fullTranslation": "Complete translation in ${nativeLang}"
}`

  return { systemPrompt, userPrompt }
}

async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.8
): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
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
      temperature,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 200)}`)
  }

  const data: any = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from DeepSeek')
  return content
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(console.error)
