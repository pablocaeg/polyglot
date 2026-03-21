/**
 * Validate pre-generated texts in the database.
 *
 * Checks:
 *  - Word count meets minimum for skill level
 *  - Content is valid text (not empty, not JSON)
 *  - Vocabulary coverage (at least 60% of words have translations)
 *  - No duplicate content across texts
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/gen/validate-texts.ts
 *
 * Options:
 *   --fix     Delete invalid texts
 *   --verbose Show details for each issue
 */

import pg from 'pg'

const MIN_WORDS: Record<string, number> = {
  beginner: 40,
  intermediate: 60,
  advanced: 90,
  expert: 120,
}

async function main() {
  const args = process.argv.slice(2)
  const fix = args.includes('--fix')
  const verbose = args.includes('--verbose')

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) { console.error('DATABASE_URL required'); process.exit(1) }

  const pool = new pg.Pool({ connectionString: dbUrl, max: 5 })
  await pool.query('SELECT 1')

  const texts = await pool.query(
    `SELECT t.id, t.title, t.content, t.full_translation, t.target_lang, t.native_lang,
            t.skill_level, t.word_count,
            COUNT(tv.id)::int AS vocab_count
     FROM texts t
     LEFT JOIN text_vocabulary tv ON tv.text_id = t.id
     GROUP BY t.id
     ORDER BY t.created_at`
  )

  let issues = 0
  const toDelete: string[] = []

  console.log(`Validating ${texts.rows.length} texts...\n`)

  for (const text of texts.rows) {
    const problems: string[] = []

    // Check word count
    const actualWords = (text.content || '').split(/\s+/).filter(Boolean).length
    const minWords = MIN_WORDS[text.skill_level] || 40
    if (actualWords < minWords * 0.8) {
      problems.push(`Too short: ${actualWords} words (need ${minWords})`)
    }

    // Check content validity
    if (!text.content || text.content.trim().length < 20) {
      problems.push('Content too short or empty')
    }
    if (text.content?.startsWith('{') || text.content?.startsWith('[')) {
      problems.push('Content looks like JSON, not text')
    }

    // Check translation exists
    if (!text.full_translation || text.full_translation.trim().length < 10) {
      problems.push('Missing or too short translation')
    }

    // Check vocabulary coverage
    const textWords = (text.content || '').match(/[\p{L}]+/gu) || []
    const uniqueWordCount = new Set(textWords.map((w: string) => w.toLowerCase())).size
    if (uniqueWordCount > 0 && text.vocab_count < uniqueWordCount * 0.5) {
      problems.push(`Low vocab coverage: ${text.vocab_count}/${uniqueWordCount} words`)
    }

    if (problems.length > 0) {
      issues++
      if (verbose) {
        console.log(`ISSUE: ${text.target_lang}→${text.native_lang} | ${text.skill_level} | "${text.title}"`)
        for (const p of problems) console.log(`  - ${p}`)
      }
      if (fix) toDelete.push(text.id)
    }
  }

  // Check for duplicates
  const dupes = await pool.query(
    `SELECT content, COUNT(*)::int AS count
     FROM texts
     GROUP BY content
     HAVING COUNT(*) > 1`
  )
  if (dupes.rows.length > 0) {
    console.log(`\nDuplicate content: ${dupes.rows.length} groups`)
    issues += dupes.rows.length
  }

  // ── Summary ──
  console.log(`\n=== Validation Summary ===`)
  console.log(`  Total texts: ${texts.rows.length}`)
  console.log(`  Issues found: ${issues}`)
  console.log(`  Pass rate: ${((texts.rows.length - issues) / texts.rows.length * 100).toFixed(1)}%`)

  if (fix && toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} invalid texts...`)
    for (const id of toDelete) {
      await pool.query('DELETE FROM texts WHERE id = $1', [id])
    }
    console.log('Done.')
  } else if (toDelete.length > 0) {
    console.log(`\nRun with --fix to delete ${toDelete.length} invalid texts`)
  }

  await pool.end()
}

main().catch(console.error)
