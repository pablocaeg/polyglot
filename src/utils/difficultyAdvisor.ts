import type { DifficultWord, GeneratedText, SkillLevel } from '../types'

const LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']

export function suggestLevelChange(
  words: DifficultWord[],
  currentLevel: SkillLevel,
  recentTexts: GeneratedText[]
): { suggest: SkillLevel | null; reason: string } {
  const currentIdx = LEVELS.indexOf(currentLevel)

  // Look at last 3 texts at current level
  const textsAtLevel = recentTexts
    .filter((t) => t.skillLevel === currentLevel)
    .slice(0, 3)

  if (textsAtLevel.length < 2) {
    return { suggest: null, reason: '' }
  }

  const textIds = new Set(textsAtLevel.map((t) => t.id))
  const wordsFromTexts = words.filter((w) => textIds.has(w.textId))

  // Count total words generated in those texts
  const totalWords = textsAtLevel.reduce(
    (sum, t) => sum + t.wordTranslations.length,
    0
  )

  if (totalWords === 0) return { suggest: null, reason: '' }

  const difficultyRatio = wordsFromTexts.length / totalWords

  // Too many difficult words (>60%) → suggest going down
  if (difficultyRatio > 0.6 && currentIdx > 0) {
    return {
      suggest: LEVELS[currentIdx - 1],
      reason: `You marked ${Math.round(difficultyRatio * 100)}% of words as difficult in recent texts. A lower level might help build confidence.`,
    }
  }

  // Very few difficult words (<15%) + good quiz accuracy → suggest going up
  if (difficultyRatio < 0.15 && currentIdx < LEVELS.length - 1) {
    const recentReviews = words
      .flatMap((w) => w.reviewHistory || [])
      .sort((a, b) => b.date - a.date)
      .slice(0, 20)

    const accuracy = recentReviews.length > 0
      ? recentReviews.filter((r) => r.correct).length / recentReviews.length
      : 0

    if (accuracy > 0.8 || recentReviews.length === 0) {
      return {
        suggest: LEVELS[currentIdx + 1],
        reason: `You're finding texts easy with only ${Math.round(difficultyRatio * 100)}% difficult words. Ready for a challenge?`,
      }
    }
  }

  return { suggest: null, reason: '' }
}
