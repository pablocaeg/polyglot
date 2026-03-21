/**
 * Parse Wiktionary dumps using wiktextract into structured JSONL.
 *
 * Prerequisites:
 *   pip install wiktextract
 *   Run 01-download.sh first
 *
 * Usage:
 *   npx tsx scripts/dict/02-parse-wiktionary.ts [DATA_DIR]
 *
 * Output: data/parsed/wiktionary/{lang}.jsonl
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = process.argv[2] || './data'
const RAW_DIR = path.join(DATA_DIR, 'raw', 'wiktionary')
const OUT_DIR = path.join(DATA_DIR, 'parsed', 'wiktionary')

const LANGS = ['pl', 'es', 'en', 'fr', 'de', 'it', 'pt']

mkdirSync(OUT_DIR, { recursive: true })

for (const lang of LANGS) {
  const dumpFile = path.join(RAW_DIR, `${lang}wiktionary-pages-articles.xml.bz2`)
  const outFile = path.join(OUT_DIR, `${lang}.jsonl`)

  if (!existsSync(dumpFile)) {
    console.log(`[${lang}] Dump not found: ${dumpFile} — skipping`)
    continue
  }

  if (existsSync(outFile)) {
    console.log(`[${lang}] Already parsed: ${outFile} — skipping`)
    continue
  }

  console.log(`[${lang}] Parsing Wiktionary dump...`)
  console.log(`  Input:  ${dumpFile}`)
  console.log(`  Output: ${outFile}`)

  try {
    // wiktextract outputs one JSON object per line (JSONL)
    // Each entry has: word, pos, senses (with glosses/translations), forms, etc.
    execSync(
      `python3 -m wiktextract --language ${lang} --out ${outFile} ${dumpFile}`,
      { stdio: 'inherit', timeout: 3600_000 } // 1 hour timeout per language
    )
    console.log(`[${lang}] Done.`)
  } catch (err: any) {
    console.error(`[${lang}] Parse failed:`, err.message)
    console.error(`  Try: pip install wiktextract`)
  }
}

console.log('\nParsing complete. Next: npx tsx scripts/dict/03-parse-freedict.ts')
