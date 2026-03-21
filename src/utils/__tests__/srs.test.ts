import { describe, it, expect } from 'vitest'
import { sm2, masteryFromRepetitions, qualityFromOutcome, SRS_DEFAULTS } from '../srs'

describe('sm2', () => {
  it('resets on incorrect answer (quality < 3)', () => {
    const result = sm2(1, 5, 2.5, 30)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
    expect(result.easeFactor).toBeLessThan(2.5)
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('sets interval to 1 for first correct answer', () => {
    const result = sm2(4, 0, 2.5, 0)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
  })

  it('sets interval to 6 for second correct answer', () => {
    const result = sm2(4, 1, 2.5, 1)
    expect(result.repetitions).toBe(2)
    expect(result.interval).toBe(6)
  })

  it('multiplies interval by ease factor after second repetition', () => {
    const result = sm2(4, 2, 2.5, 6)
    expect(result.repetitions).toBe(3)
    expect(result.interval).toBe(Math.round(6 * 2.5))
  })

  it('never drops ease factor below 1.3', () => {
    let ef = 1.4
    for (let i = 0; i < 10; i++) {
      const r = sm2(0, 3, ef, 10)
      ef = r.easeFactor
    }
    expect(ef).toBeGreaterThanOrEqual(1.3)
  })

  it('clamps quality to 0-5 range', () => {
    const low = sm2(-1, 0, 2.5, 0)
    expect(low.repetitions).toBe(0) // quality 0 → incorrect

    const high = sm2(10, 0, 2.5, 0)
    expect(high.repetitions).toBe(1) // quality 5 → correct
  })

  it('perfect answer (5) increases ease factor', () => {
    const result = sm2(5, 3, 2.5, 15)
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('quality 3 (difficult but correct) decreases ease factor', () => {
    const result = sm2(3, 3, 2.5, 15)
    expect(result.easeFactor).toBeLessThan(2.5)
  })
})

describe('masteryFromRepetitions', () => {
  it('returns new for 0 repetitions', () => {
    expect(masteryFromRepetitions(0)).toBe('new')
  })

  it('returns recognized for 1-2 repetitions', () => {
    expect(masteryFromRepetitions(1)).toBe('recognized')
    expect(masteryFromRepetitions(2)).toBe('recognized')
  })

  it('returns recalled for 3-5 repetitions', () => {
    expect(masteryFromRepetitions(3)).toBe('recalled')
    expect(masteryFromRepetitions(5)).toBe('recalled')
  })

  it('returns mastered for 6+ repetitions', () => {
    expect(masteryFromRepetitions(6)).toBe('mastered')
    expect(masteryFromRepetitions(100)).toBe('mastered')
  })
})

describe('qualityFromOutcome', () => {
  it('returns 4 for correct quiz', () => {
    expect(qualityFromOutcome('quiz', true)).toBe(4)
  })

  it('returns 1 for incorrect quiz', () => {
    expect(qualityFromOutcome('quiz', false)).toBe(1)
  })

  it('returns 4 for correct flashcard', () => {
    expect(qualityFromOutcome('flashcard', true)).toBe(4)
  })

  it('returns 2 for incorrect flashcard', () => {
    expect(qualityFromOutcome('flashcard', false)).toBe(2)
  })
})

describe('SRS_DEFAULTS', () => {
  it('has expected default values', () => {
    expect(SRS_DEFAULTS.srsEaseFactor).toBe(2.5)
    expect(SRS_DEFAULTS.srsInterval).toBe(0)
    expect(SRS_DEFAULTS.srsRepetitions).toBe(0)
    expect(SRS_DEFAULTS.mastery).toBe('new')
  })
})
