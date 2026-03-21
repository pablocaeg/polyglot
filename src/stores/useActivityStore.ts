import { create } from 'zustand'
import type { DailyActivity } from '../types'
import * as storage from '../services/storage'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyDay(date: string): DailyActivity {
  return { date, reviewCount: 0, wordsLearned: 0, textsRead: 0, quizCorrect: 0, quizTotal: 0 }
}

interface ActivityState {
  today: DailyActivity
  history: DailyActivity[]
  streak: number
  loaded: boolean
  loadActivity: () => Promise<void>
  recordReview: () => Promise<void>
  recordWordLearned: () => Promise<void>
  recordTextRead: () => Promise<void>
  recordQuizResult: (correct: number, total: number) => Promise<void>
}

function computeStreak(history: DailyActivity[], dailyGoal: number): number {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = todayKey()

  for (let i = 0; i < sorted.length; i++) {
    const expected = new Date()
    expected.setDate(expected.getDate() - i)
    const expectedKey = expected.toISOString().slice(0, 10)

    const day = sorted.find((d) => d.date === expectedKey)
    if (!day) {
      // If today hasn't been logged yet, skip it
      if (expectedKey === today && i === 0) continue
      break
    }
    if (day.reviewCount >= dailyGoal) {
      streak++
    } else if (expectedKey !== today) {
      break
    }
  }

  return streak
}

export const useActivityStore = create<ActivityState>()((set, get) => ({
  today: emptyDay(todayKey()),
  history: [],
  streak: 0,
  loaded: false,

  loadActivity: async () => {
    const key = todayKey()
    const existing = await storage.getDailyActivity(key)
    const today = existing || emptyDay(key)
    const history = await storage.getAllDailyActivity()
    // Get daily goal from settings localStorage
    let dailyGoal = 10
    try {
      const settings = JSON.parse(localStorage.getItem('polyglot-settings') || '{}')
      dailyGoal = settings?.state?.dailyGoal || 10
    } catch { /* use default */ }
    const streak = computeStreak(history, dailyGoal)
    set({ today, history, streak, loaded: true })
  },

  recordReview: async () => {
    const key = todayKey()
    const current = get().today.date === key ? get().today : emptyDay(key)
    const updated = { ...current, reviewCount: current.reviewCount + 1 }
    await storage.saveDailyActivity(updated)
    set({ today: updated })
  },

  recordWordLearned: async () => {
    const key = todayKey()
    const current = get().today.date === key ? get().today : emptyDay(key)
    const updated = { ...current, wordsLearned: current.wordsLearned + 1 }
    await storage.saveDailyActivity(updated)
    set({ today: updated })
  },

  recordTextRead: async () => {
    const key = todayKey()
    const current = get().today.date === key ? get().today : emptyDay(key)
    const updated = { ...current, textsRead: current.textsRead + 1 }
    await storage.saveDailyActivity(updated)
    set({ today: updated })
  },

  recordQuizResult: async (correct, total) => {
    const key = todayKey()
    const current = get().today.date === key ? get().today : emptyDay(key)
    const updated = {
      ...current,
      quizCorrect: current.quizCorrect + correct,
      quizTotal: current.quizTotal + total,
    }
    await storage.saveDailyActivity(updated)
    set({ today: updated })
  },
}))
