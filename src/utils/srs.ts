/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Quality scale:
 *   0-2 = incorrect (reset repetitions)
 *   3   = correct with difficulty
 *   4   = correct
 *   5   = perfect
 */

import type { MasteryLevel } from '../types'

export interface SM2Result {
  repetitions: number
  easeFactor: number
  interval: number // days
}

export function sm2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): SM2Result {
  quality = Math.max(0, Math.min(5, Math.round(quality)))

  if (quality < 3) {
    // Incorrect — reset
    return {
      repetitions: 0,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      interval: 1,
    }
  }

  // Correct
  let newInterval: number
  const newRepetitions = repetitions + 1

  if (repetitions === 0) {
    newInterval = 1
  } else if (repetitions === 1) {
    newInterval = 6
  } else {
    newInterval = Math.round(interval * easeFactor)
  }

  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
  }
}

/** Map SM-2 repetitions to a mastery level */
export function masteryFromRepetitions(repetitions: number): MasteryLevel {
  if (repetitions === 0) return 'new'
  if (repetitions <= 2) return 'recognized'
  if (repetitions <= 5) return 'recalled'
  return 'mastered'
}

/** Map flashcard/quiz outcome to SM-2 quality */
export function qualityFromOutcome(type: 'flashcard' | 'quiz', correct: boolean): number {
  if (type === 'quiz') return correct ? 4 : 1
  // flashcard: "Got it" = correct, "Still learning" = incorrect
  return correct ? 4 : 2
}

/** Default SRS values for a newly created word */
export const SRS_DEFAULTS = {
  srsEaseFactor: 2.5,
  srsInterval: 0,
  srsRepetitions: 0,
  srsNextReview: Date.now(),
  mastery: 'new' as MasteryLevel,
}
