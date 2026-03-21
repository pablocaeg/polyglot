import type { DifficultWord, WordTranslation } from '../types'

/**
 * Find words related to a target word by shared root/prefix.
 * Uses simple longest-common-prefix heuristic (4+ chars)
 * and substring containment.
 */
export function findRelatedWords(
  targetWord: string,
  savedWords: DifficultWord[],
  wordTranslations: WordTranslation[]
): Array<{ word: string; translation: string }> {
  const target = targetWord.toLowerCase()
  const results = new Map<string, string>()

  // Check saved difficult words
  for (const w of savedWords) {
    const word = w.word.toLowerCase()
    if (word === target) continue
    if (isRelated(target, word)) {
      results.set(w.word, w.translation)
    }
  }

  // Check word translations from all texts
  for (const wt of wordTranslations) {
    const word = wt.word.toLowerCase()
    if (word === target || results.has(wt.word)) continue
    if (isRelated(target, word)) {
      results.set(wt.word, wt.translation)
    }
  }

  return Array.from(results.entries())
    .map(([word, translation]) => ({ word, translation }))
    .slice(0, 5)
}

function isRelated(a: string, b: string): boolean {
  // One contains the other
  if (a.length >= 3 && b.includes(a)) return true
  if (b.length >= 3 && a.includes(b)) return true

  // Shared prefix of 4+ characters
  const minLen = Math.min(a.length, b.length)
  let commonPrefix = 0
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) commonPrefix++
    else break
  }
  return commonPrefix >= 4
}
