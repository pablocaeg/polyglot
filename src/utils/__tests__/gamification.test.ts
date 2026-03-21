import { describe, it, expect } from 'vitest'
import {
  getLevelForXP,
  getXPProgress,
  LEVELS,
  ACHIEVEMENTS,
  XP_REWARDS,
} from '../gamification'
import type { AchievementStats } from '../gamification'

describe('getLevelForXP', () => {
  it('returns Novice for 0 XP', () => {
    expect(getLevelForXP(0)).toEqual(LEVELS[0])
    expect(getLevelForXP(0).name).toBe('Novice')
  })

  it('returns Beginner at 100 XP', () => {
    expect(getLevelForXP(100).name).toBe('Beginner')
  })

  it('stays at current level just below next threshold', () => {
    expect(getLevelForXP(99).name).toBe('Novice')
    expect(getLevelForXP(299).name).toBe('Beginner')
  })

  it('returns Polyglot at 5000+ XP', () => {
    expect(getLevelForXP(5000).name).toBe('Polyglot')
    expect(getLevelForXP(99999).name).toBe('Polyglot')
  })

  it('returns Novice for negative XP', () => {
    expect(getLevelForXP(-10).name).toBe('Novice')
  })
})

describe('getXPProgress', () => {
  it('returns 0% at start of a level', () => {
    const progress = getXPProgress(100) // exactly Beginner
    expect(progress.current).toBe(0)
    expect(progress.percent).toBe(0)
  })

  it('returns 50% halfway through a level', () => {
    // Beginner: 100-300, midpoint = 200
    const progress = getXPProgress(200)
    expect(progress.percent).toBe(50)
  })

  it('returns 100% at max level', () => {
    const progress = getXPProgress(5000)
    expect(progress.percent).toBe(100)
  })

  it('calculates correct needed XP', () => {
    const progress = getXPProgress(0) // Novice, next is Beginner at 100
    expect(progress.needed).toBe(100)
  })
})

describe('LEVELS', () => {
  it('has 8 levels', () => {
    expect(LEVELS).toHaveLength(8)
  })

  it('levels are sorted by xpRequired ascending', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].xpRequired).toBeGreaterThan(LEVELS[i - 1].xpRequired)
    }
  })

  it('first level starts at 0 XP', () => {
    expect(LEVELS[0].xpRequired).toBe(0)
  })
})

describe('ACHIEVEMENTS', () => {
  it('has 12 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(12)
  })

  it('all achievements have unique IDs', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('first_words unlocks at 5 saved words', () => {
    const check = ACHIEVEMENTS.find((a) => a.id === 'first_words')!.check
    const base: AchievementStats = {
      totalWordsSaved: 0, totalTextsRead: 0, totalQuizzes: 0,
      perfectQuizzes: 0, currentStreak: 0, longestStreak: 0,
      masteredWords: 0, textsReadToday: 0, totalXP: 0,
    }
    expect(check({ ...base, totalWordsSaved: 4 })).toBe(false)
    expect(check({ ...base, totalWordsSaved: 5 })).toBe(true)
  })

  it('week_warrior requires 7-day streak', () => {
    const check = ACHIEVEMENTS.find((a) => a.id === 'week_warrior')!.check
    const base: AchievementStats = {
      totalWordsSaved: 0, totalTextsRead: 0, totalQuizzes: 0,
      perfectQuizzes: 0, currentStreak: 0, longestStreak: 0,
      masteredWords: 0, textsReadToday: 0, totalXP: 0,
    }
    expect(check({ ...base, currentStreak: 6 })).toBe(false)
    expect(check({ ...base, currentStreak: 7 })).toBe(true)
  })
})

describe('XP_REWARDS', () => {
  it('has positive values for all actions', () => {
    for (const [, value] of Object.entries(XP_REWARDS)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})
