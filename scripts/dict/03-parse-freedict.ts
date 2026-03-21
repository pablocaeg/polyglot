/**
 * Parse FreeDict TEI-XML bilingual dictionaries into JSONL.
 *
 * Usage:
 *   npx tsx scripts/dict/03-parse-freedict.ts [DATA_DIR]
 *
 * Output: data/parsed/freedict/{pair}.jsonl
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'

const DATA_DIR = process.argv[2] || './data'
const RAW_DIR = path.join(DATA_DIR, 'raw', 'freedict')
const OUT_DIR = path.join(DATA_DIR, 'parsed', 'freedict')

// ISO 639-3 to our 2-letter codes
const LANG_MAP: Record<string, string> = {
  eng: 'en', spa: 'es', pol: 'pl', fra: 'fr', deu: 'de', ita: 'it', por: 'pt',
}

mkdirSync(OUT_DIR, { recursive: true })

if (!existsSync(RAW_DIR)) {
  console.log('No FreeDict data found. Run 01-download.sh first.')
  process.exit(0)
}

const archives = readdirSync(RAW_DIR).filter(f => f.endsWith('.tei.tar.xz'))

for (const archive of archives) {
  const pairMatch = archive.match(/^(\w+)-(\w+)\.tei/)
  if (!pairMatch) continue

  const [, srcCode, tgtCode] = pairMatch
  const srcLang = LANG_MAP[srcCode]
  const tgtLang = LANG_MAP[tgtCode]

  if (!srcLang || !tgtLang) {
    console.log(`Skipping unknown pair: ${srcCode}-${tgtCode}`)
    continue
  }

  const outFile = path.join(OUT_DIR, `${srcLang}-${tgtLang}.jsonl`)
  if (existsSync(outFile)) {
    console.log(`[${srcLang}-${tgtLang}] Already parsed — skipping`)
    continue
  }

  console.log(`[${srcLang}-${tgtLang}] Extracting and parsing...`)

  const archivePath = path.join(RAW_DIR, archive)
  const tmpDir = path.join(RAW_DIR, `_tmp_${srcCode}-${tgtCode}`)

  try {
    mkdirSync(tmpDir, { recursive: true })
    execSync(`tar -xf "${archivePath}" -C "${tmpDir}"`, { stdio: 'pipe' })

    // Find the .tei file
    const teiFiles = readdirSync(tmpDir, { recursive: true })
      .map(String)
      .filter(f => f.endsWith('.tei'))

    if (teiFiles.length === 0) {
      console.log(`  No .tei file found in archive`)
      continue
    }

    const teiContent = readFileSync(path.join(tmpDir, teiFiles[0]), 'utf8')
    const entries = parseTEI(teiContent, srcLang, tgtLang)

    const jsonl = entries.map(e => JSON.stringify(e)).join('\n')
    writeFileSync(outFile, jsonl + '\n')
    console.log(`  Wrote ${entries.length} entries to ${outFile}`)
  } catch (err: any) {
    console.error(`  Failed: ${err.message}`)
  } finally {
    execSync(`rm -rf "${tmpDir}"`, { stdio: 'pipe' })
  }
}

console.log('\nFreeDict parsing complete. Next: npx tsx scripts/dict/04-merge.ts')

/** Simple TEI XML parser — extracts <entry> elements with <orth> and <cit> */
function parseTEI(xml: string, srcLang: string, tgtLang: string) {
  const entries: Array<{
    word: string
    word_display: string
    lang: string
    pos: string | null
    translation: string
    target_lang: string
    source: string
  }> = []

  // Match each <entry> block
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]

    // Extract headword
    const orthMatch = block.match(/<orth>([^<]+)<\/orth>/)
    if (!orthMatch) continue
    const word = orthMatch[1].trim()

    // Extract POS
    const posMatch = block.match(/<pos>([^<]+)<\/pos>/)
    const pos = posMatch ? normalizePOS(posMatch[1].trim()) : null

    // Extract translations (from <cit> elements)
    const citRegex = /<cit[^>]*>[\s\S]*?<quote>([^<]+)<\/quote>[\s\S]*?<\/cit>/g
    let citMatch: RegExpExecArray | null

    while ((citMatch = citRegex.exec(block)) !== null) {
      const translation = citMatch[1].trim()
      if (translation) {
        entries.push({
          word: word.toLowerCase(),
          word_display: word,
          lang: srcLang,
          pos,
          translation,
          target_lang: tgtLang,
          source: 'freedict',
        })
      }
    }
  }

  return entries
}

function normalizePOS(raw: string): string | null {
  const map: Record<string, string> = {
    n: 'noun', noun: 'noun',
    v: 'verb', verb: 'verb',
    adj: 'adj', adjective: 'adj',
    adv: 'adv', adverb: 'adv',
    prep: 'prep', preposition: 'prep',
    conj: 'conj', conjunction: 'conj',
    pron: 'pron', pronoun: 'pron',
    art: 'art', article: 'art',
    num: 'num', numeral: 'num',
    interj: 'interj', interjection: 'interj',
  }
  return map[raw.toLowerCase()] || null
}
