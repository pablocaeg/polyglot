/**
 * LLM gap-fill: generate translations for high-frequency words
 * that are missing from the dictionary.
 *
 * Targets the top 5,000 most common words per language pair.
 * Marks results with source='llm', confidence=0.7.
 *
 * Usage:
 *   DATABASE_URL=... DEEPSEEK_API_KEY=... npx tsx scripts/dict/06-gap-fill.ts
 *
 * Options:
 *   --lang es       Only process one source language
 *   --target pl     Only process one target language
 *   --limit 100     Max words to fill per pair (default: 5000)
 *   --dry-run       Print what would be generated without calling LLM
 */

import pg from 'pg'

const LANGS = ['pl', 'es', 'en', 'fr', 'de', 'it', 'pt']
const LANG_NAMES: Record<string, string> = {
  pl: 'Polish', es: 'Spanish', en: 'English',
  fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
}

// Common words per language (top ~200 as seed — expand with frequency lists)
// These are used only when the DB has no frequency data
const COMMON_WORDS: Record<string, string[]> = {
  es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no', 'haber', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo', 'pero', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro', 'ese', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'muy', 'sin', 'tiempo', 'mucho', 'saber', 'qué', 'sobre', 'mi', 'alguno', 'mismo', 'yo', 'también'],
  pl: ['i', 'w', 'nie', 'na', 'to', 'z', 'się', 'że', 'do', 'jest', 'co', 'jak', 'ale', 'o', 'tak', 'ten', 'za', 'od', 'po', 'ja', 'być', 'by', 'który', 'on', 'już', 'ty', 'mieć', 'tylko', 'czy', 'pan', 'jego', 'jeszcze', 'tu', 'bardzo', 'my', 'wy', 'go', 'mnie', 'jej', 'mi', 'tam', 'pan', 'też', 'gdzie', 'kiedy', 'teraz', 'dzień', 'dom', 'czas', 'rok'],
  en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'],
  fr: ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'en', 'du', 'elle', 'au', 'pour', 'pas', 'que', 'vous', 'par', 'sur', 'faire', 'plus', 'dire', 'me', 'on', 'mon', 'lui', 'nous', 'comme', 'mais', 'pouvoir', 'avec', 'tout', 'y', 'aller', 'voir', 'bien', 'où', 'sans', 'tu', 'ou', 'leur', 'homme', 'si'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird', 'bei', 'einer', 'um', 'am', 'sind', 'noch', 'wie', 'einem', 'über', 'so', 'zum', 'aber', 'haben', 'nur', 'oder', 'vor', 'zur', 'bis', 'mehr'],
  it: ['di', 'che', 'è', 'e', 'la', 'il', 'un', 'a', 'per', 'in', 'una', 'mi', 'sono', 'ho', 'non', 'ma', 'lo', 'si', 'ha', 'le', 'con', 'no', 'da', 'questo', 'io', 'ci', 'come', 'se', 'cosa', 'tutto', 'lui', 'bene', 'del', 'qui', 'anche', 'mio', 'al', 'quello', 'lei', 'era', 'più', 'suo', 'fatto', 'già', 'fare', 'stato', 'solo', 'dei', 'me', 'ti'],
  pt: ['de', 'que', 'e', 'o', 'a', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era'],
}

const BATCH_SIZE = 20  // Words per LLM call
const RATE_LIMIT_MS = 1000  // Delay between API calls

async function main() {
  const args = process.argv.slice(2)
  const langFilter = getArg(args, '--lang')
  const targetFilter = getArg(args, '--target')
  const limit = parseInt(getArg(args, '--limit') || '5000', 10)
  const dryRun = args.includes('--dry-run')

  const dbUrl = process.env.DATABASE_URL
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1) }
  if (!apiKey && !dryRun) { console.error('DEEPSEEK_API_KEY required'); process.exit(1) }

  const pool = new pg.Pool({ connectionString: dbUrl, max: 5 })
  await pool.query('SELECT 1')
  console.log('Connected to PostgreSQL')

  const sourceLangs = langFilter ? [langFilter] : LANGS
  const targetLangs = targetFilter ? [targetFilter] : LANGS

  for (const srcLang of sourceLangs) {
    for (const tgtLang of targetLangs) {
      if (srcLang === tgtLang) continue

      console.log(`\n=== ${LANG_NAMES[srcLang]} → ${LANG_NAMES[tgtLang]} ===`)

      // Find words in source language that don't have translations to target
      const result = await pool.query(
        `SELECT de.id, de.word, de.word_display, de.pos
         FROM dictionary_entries de
         WHERE de.lang = $1
           AND NOT EXISTS (
             SELECT 1 FROM translations t
             WHERE t.source_entry_id = de.id AND t.target_lang = $2
           )
         ORDER BY de.frequency ASC NULLS LAST
         LIMIT $3`,
        [srcLang, tgtLang, limit]
      )

      let missingWords = result.rows

      // If DB is mostly empty, use common words list
      if (missingWords.length === 0) {
        const seedWords = COMMON_WORDS[srcLang] || []
        if (seedWords.length > 0) {
          console.log(`  No DB entries yet — using seed list (${seedWords.length} words)`)
          missingWords = seedWords.slice(0, limit).map(w => ({
            id: null, word: w, word_display: w, pos: null,
          }))
        }
      }

      if (missingWords.length === 0) {
        console.log('  All covered!')
        continue
      }

      console.log(`  Missing: ${missingWords.length} words`)

      if (dryRun) {
        console.log(`  [DRY RUN] Would generate translations for ${missingWords.length} words`)
        continue
      }

      // Process in batches
      for (let i = 0; i < missingWords.length; i += BATCH_SIZE) {
        const batch = missingWords.slice(i, i + BATCH_SIZE)
        const wordList = batch.map(w => w.word_display || w.word).join(', ')

        try {
          const prompt = `Translate these ${LANG_NAMES[srcLang]} words to ${LANG_NAMES[tgtLang]}.
For each word provide: the translation, part of speech (noun/verb/adj/adv/prep/conj/pron/art/num/interj), and a brief grammar note in ${LANG_NAMES[tgtLang]}.

Words: ${wordList}

Respond with JSON:
{"translations": [{"word": "original", "translation": "${LANG_NAMES[tgtLang]} translation", "pos": "noun", "grammar": "brief note"}]}`

          const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: `You are a precise ${LANG_NAMES[srcLang]}-${LANG_NAMES[tgtLang]} dictionary. Respond with valid JSON only.` },
                { role: 'user', content: prompt },
              ],
              temperature: 0.3,
              response_format: { type: 'json_object' },
            }),
          })

          if (!res.ok) {
            console.error(`  API error: ${res.status}`)
            await sleep(5000)
            continue
          }

          const data: any = await res.json()
          const content = data.choices?.[0]?.message?.content
          if (!content) continue

          const parsed = JSON.parse(content)
          const translations = parsed.translations || []

          // Insert results
          const client = await pool.connect()
          try {
            await client.query('BEGIN')
            for (const tr of translations) {
              if (!tr.word || !tr.translation) continue

              // Ensure entry exists
              const entryRes = await client.query(
                `INSERT INTO dictionary_entries (lang, word, word_display, pos)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (lang, word, pos) DO UPDATE SET word_display = EXCLUDED.word_display
                 RETURNING id`,
                [srcLang, tr.word.toLowerCase(), tr.word, tr.pos || null]
              )

              if (entryRes.rows.length > 0) {
                await client.query(
                  `INSERT INTO translations (source_entry_id, target_lang, translation, grammar_note, source, confidence)
                   VALUES ($1, $2, $3, $4, 'llm', 0.7)
                   ON CONFLICT (source_entry_id, target_lang, translation) DO NOTHING`,
                  [entryRes.rows[0].id, tgtLang, tr.translation, tr.grammar || null]
                )
              }
            }
            await client.query('COMMIT')
          } catch (err) {
            await client.query('ROLLBACK')
            console.error(`  Batch insert error:`, err)
          } finally {
            client.release()
          }

          process.stdout.write(`\r  Filled ${Math.min(i + BATCH_SIZE, missingWords.length)}/${missingWords.length}`)
          await sleep(RATE_LIMIT_MS)
        } catch (err: any) {
          console.error(`  Batch error: ${err.message}`)
          await sleep(5000)
        }
      }
      console.log() // newline after progress
    }
  }

  await pool.end()
  console.log('\nGap-fill complete.')
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(console.error)
