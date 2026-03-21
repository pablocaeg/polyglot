/**
 * Bulk import merged dictionary data into PostgreSQL.
 *
 * Uses batched INSERT ... ON CONFLICT for idempotent imports.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/dict/05-import.ts [DATA_DIR]
 */

import pg from 'pg'
import { createReadStream, existsSync } from 'fs'
import { createInterface } from 'readline'
import path from 'path'

const DATA_DIR = process.argv[2] || './data'
const MERGED_DIR = path.join(DATA_DIR, 'merged')
const BATCH_SIZE = 500

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString: url, max: 5 })

  try {
    // Verify connection
    await pool.query('SELECT 1')
    console.log('Connected to PostgreSQL')

    // ── Import entries ──
    const entriesFile = path.join(MERGED_DIR, 'entries.jsonl')
    if (!existsSync(entriesFile)) {
      console.error(`File not found: ${entriesFile}`)
      console.error('Run scripts/dict/04-merge.ts first')
      process.exit(1)
    }

    console.log('\n=== Importing dictionary entries ===')
    let entryCount = 0
    let batch: any[] = []

    const rl1 = createInterface({ input: createReadStream(entriesFile) })
    for await (const line of rl1) {
      if (!line.trim()) continue
      try {
        batch.push(JSON.parse(line))
        if (batch.length >= BATCH_SIZE) {
          await insertEntries(pool, batch)
          entryCount += batch.length
          process.stdout.write(`\r  Imported ${entryCount} entries`)
          batch = []
        }
      } catch {}
    }
    if (batch.length > 0) {
      await insertEntries(pool, batch)
      entryCount += batch.length
    }
    console.log(`\n  Total: ${entryCount} entries`)

    // ── Import translations ──
    const transFile = path.join(MERGED_DIR, 'translations.jsonl')
    if (!existsSync(transFile)) {
      console.error(`File not found: ${transFile}`)
      process.exit(1)
    }

    console.log('\n=== Importing translations ===')
    let transCount = 0
    batch = []

    const rl2 = createInterface({ input: createReadStream(transFile) })
    for await (const line of rl2) {
      if (!line.trim()) continue
      try {
        batch.push(JSON.parse(line))
        if (batch.length >= BATCH_SIZE) {
          await insertTranslations(pool, batch)
          transCount += batch.length
          process.stdout.write(`\r  Imported ${transCount} translations`)
          batch = []
        }
      } catch {}
    }
    if (batch.length > 0) {
      await insertTranslations(pool, batch)
      transCount += batch.length
    }
    console.log(`\n  Total: ${transCount} translations`)

    // ── Summary ──
    const [entries, translations] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM dictionary_entries'),
      pool.query('SELECT COUNT(*)::int AS count FROM translations'),
    ])
    console.log(`\n=== Database totals ===`)
    console.log(`  Dictionary entries: ${entries.rows[0].count}`)
    console.log(`  Translations:       ${translations.rows[0].count}`)
  } finally {
    await pool.end()
  }
}

async function insertEntries(pool: pg.Pool, batch: any[]) {
  // Build multi-row INSERT
  const values: unknown[] = []
  const rows: string[] = []

  for (let i = 0; i < batch.length; i++) {
    const e = batch[i]
    const offset = i * 6
    rows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`)
    values.push(
      e.lang,
      e.word,
      e.word_display,
      e.lemma || null,
      e.pos || null,
      e.grammar ? JSON.stringify(e.grammar) : null,
    )
  }

  await pool.query(
    `INSERT INTO dictionary_entries (lang, word, word_display, lemma, pos, grammar)
     VALUES ${rows.join(', ')}
     ON CONFLICT (lang, word, pos) DO UPDATE SET
       word_display = COALESCE(EXCLUDED.word_display, dictionary_entries.word_display),
       lemma = COALESCE(EXCLUDED.lemma, dictionary_entries.lemma),
       grammar = COALESCE(EXCLUDED.grammar, dictionary_entries.grammar)`,
    values
  )
}

async function insertTranslations(pool: pg.Pool, batch: any[]) {
  // For each translation, we need the source_entry_id
  // Process one at a time within a transaction for correctness
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const t of batch) {
      // Find entry ID
      const result = await client.query(
        `SELECT id FROM dictionary_entries
         WHERE lang = $1 AND word = $2 AND (pos = $3 OR ($3 IS NULL AND pos IS NULL))
         LIMIT 1`,
        [t.source_lang, t.source_word, t.source_pos]
      )

      if (result.rows.length === 0) continue

      await client.query(
        `INSERT INTO translations (source_entry_id, target_lang, translation, grammar_note, source, confidence)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (source_entry_id, target_lang, translation) DO NOTHING`,
        [result.rows[0].id, t.target_lang, t.translation, t.grammar_note, t.source, t.confidence]
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

main().catch(console.error)
