/**
 * Merge parsed Wiktionary + FreeDict data, deduplicate, and output
 * consolidated JSONL files ready for DB import.
 *
 * Priority: Wiktionary > FreeDict (Wiktionary has richer data)
 *
 * Usage:
 *   npx tsx scripts/dict/04-merge.ts [DATA_DIR]
 *
 * Output: data/merged/entries.jsonl, data/merged/translations.jsonl
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import path from 'path'

const DATA_DIR = process.argv[2] || './data'
const PARSED_DIR = path.join(DATA_DIR, 'parsed')
const OUT_DIR = path.join(DATA_DIR, 'merged')

const LANGS = ['pl', 'es', 'en', 'fr', 'de', 'it', 'pt']

// Language name mapping for Wiktionary translations
const LANG_CODE_MAP: Record<string, string> = {
  Polish: 'pl', Spanish: 'es', English: 'en',
  French: 'fr', German: 'de', Italian: 'it', Portuguese: 'pt',
}

interface DictEntry {
  lang: string
  word: string
  word_display: string
  lemma: string | null
  pos: string | null
  grammar: Record<string, unknown> | null
  frequency: number | null
}

interface Translation {
  // Refers to entry by (lang, word, pos) key
  source_lang: string
  source_word: string
  source_pos: string | null
  target_lang: string
  translation: string
  grammar_note: string | null
  source: string
  confidence: number
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const entries = new Map<string, DictEntry>() // key: lang:word:pos
  const translations: Translation[] = []

  // ── Parse Wiktionary JSONL ──
  const wiktDir = path.join(PARSED_DIR, 'wiktionary')
  if (existsSync(wiktDir)) {
    for (const lang of LANGS) {
      const file = path.join(wiktDir, `${lang}.jsonl`)
      if (!existsSync(file)) continue

      console.log(`Processing Wiktionary [${lang}]...`)
      let count = 0

      const rl = createInterface({ input: createReadStream(file) })
      for await (const line of rl) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line)
          const word = String(entry.word || '').trim()
          if (!word) continue

          const pos = normalizePOS(entry.pos)
          const key = `${lang}:${word.toLowerCase()}:${pos || ''}`

          if (!entries.has(key)) {
            entries.set(key, {
              lang,
              word: word.toLowerCase(),
              word_display: word,
              lemma: null, // Wiktextract doesn't always give lemma directly
              pos,
              grammar: entry.forms ? { forms: entry.forms.slice(0, 10) } : null,
              frequency: null,
            })
          }

          // Extract translations from senses
          if (Array.isArray(entry.senses)) {
            for (const sense of entry.senses) {
              if (Array.isArray(sense.translations)) {
                for (const tr of sense.translations) {
                  const tgtLang = LANG_CODE_MAP[tr.lang || tr.language || '']
                  if (!tgtLang || tgtLang === lang) continue
                  const translation = String(tr.word || tr.text || '').trim()
                  if (!translation) continue

                  translations.push({
                    source_lang: lang,
                    source_word: word.toLowerCase(),
                    source_pos: pos,
                    target_lang: tgtLang,
                    translation,
                    grammar_note: tr.note || null,
                    source: 'wiktionary',
                    confidence: 1.0,
                  })
                }
              }
            }
          }
          count++
        } catch {}
      }
      console.log(`  Processed ${count} Wiktionary entries for [${lang}]`)
    }
  }

  // ── Parse FreeDict JSONL ──
  const fdDir = path.join(PARSED_DIR, 'freedict')
  if (existsSync(fdDir)) {
    const files = readdirSync(fdDir).filter(f => f.endsWith('.jsonl'))
    for (const file of files) {
      console.log(`Processing FreeDict [${file}]...`)
      let count = 0

      const rl = createInterface({ input: createReadStream(path.join(fdDir, file)) })
      for await (const line of rl) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line)
          const key = `${entry.lang}:${entry.word}:${entry.pos || ''}`

          // Add entry if not already from Wiktionary
          if (!entries.has(key)) {
            entries.set(key, {
              lang: entry.lang,
              word: entry.word,
              word_display: entry.word_display,
              lemma: null,
              pos: entry.pos,
              grammar: null,
              frequency: null,
            })
          }

          // Add translation (deduplicate later in DB via UNIQUE constraint)
          translations.push({
            source_lang: entry.lang,
            source_word: entry.word,
            source_pos: entry.pos,
            target_lang: entry.target_lang,
            translation: entry.translation,
            grammar_note: null,
            source: 'freedict',
            confidence: 0.9,
          })
          count++
        } catch {}
      }
      console.log(`  Processed ${count} FreeDict entries`)
    }
  }

  // ── Write merged output ──
  console.log(`\nMerging: ${entries.size} entries, ${translations.length} translations`)

  const entriesOut = path.join(OUT_DIR, 'entries.jsonl')
  const transOut = path.join(OUT_DIR, 'translations.jsonl')

  writeFileSync(
    entriesOut,
    [...entries.values()].map(e => JSON.stringify(e)).join('\n') + '\n'
  )

  writeFileSync(
    transOut,
    translations.map(t => JSON.stringify(t)).join('\n') + '\n'
  )

  console.log(`\nOutput:`)
  console.log(`  Entries:      ${entriesOut} (${entries.size} records)`)
  console.log(`  Translations: ${transOut} (${translations.length} records)`)
  console.log(`\nNext: npx tsx scripts/dict/05-import.ts`)
}

function normalizePOS(raw: string | undefined): string | null {
  if (!raw) return null
  const map: Record<string, string> = {
    n: 'noun', noun: 'noun', name: 'noun',
    v: 'verb', verb: 'verb',
    adj: 'adj', adjective: 'adj',
    adv: 'adv', adverb: 'adv',
    prep: 'prep', preposition: 'prep',
    conj: 'conj', conjunction: 'conj',
    pron: 'pron', pronoun: 'pron',
    art: 'art', article: 'art', det: 'art',
    num: 'num', numeral: 'num',
    interj: 'interj', interjection: 'interj',
    particle: 'conj', prefix: 'noun', suffix: 'noun',
  }
  return map[raw.toLowerCase()] || null
}

main().catch(console.error)
