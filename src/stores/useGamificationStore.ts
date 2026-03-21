import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type AchievementId,
  type AchievementStats,
  ACHIEVEMENTS,
  XP_REWARDS,
} from '../utils/gamification'

interface GamificationState {
  xp: number
  unlockedAchievements: AchievementId[]
  perfectQuizzes: number
  totalQuizzes: number
  totalTextsRead: number
  textsReadToday: string // date string 'YYYY-MM-DD'
  textsReadTodayCount: number
  /** Pending toast to show */
  pendingToast: { type: 'xp'; amount: number } | { type: 'achievement'; id: AchievementId } | null

  // Actions
  awardXP: (action: keyof typeof XP_REWARDS) => void
  recordPerfectQuiz: () => void
  recordQuizComplete: () => void
  recordTextRead: () => void
  checkAchievements: (stats: Partial<AchievementStats>) => void
  dismissToast: () => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      unlockedAchievements: [],
      perfectQuizzes: 0,
      totalQuizzes: 0,
      totalTextsRead: 0,
      textsReadToday: todayStr(),
      textsReadTodayCount: 0,
      pendingToast: null,

      awardXP: (action) => {
        const amount = XP_REWARDS[action]
        set((s) => ({
          xp: s.xp + amount,
          pendingToast: { type: 'xp', amount },
        }))
      },

      recordPerfectQuiz: () => {
        set((s) => ({ perfectQuizzes: s.perfectQuizzes + 1 }))
      },

      recordQuizComplete: () => {
        set((s) => ({ totalQuizzes: s.totalQuizzes + 1 }))
      },

      recordTextRead: () => {
        const today = todayStr()
        set((s) => ({
          totalTextsRead: s.totalTextsRead + 1,
          textsReadToday: today,
          textsReadTodayCount: s.textsReadToday === today ? s.textsReadTodayCount + 1 : 1,
        }))
      },

      checkAchievements: (partialStats) => {
        const state = get()
        const stats: AchievementStats = {
          totalWordsSaved: partialStats.totalWordsSaved ?? 0,
          totalTextsRead: state.totalTextsRead,
          totalQuizzes: state.totalQuizzes,
          perfectQuizzes: state.perfectQuizzes,
          currentStreak: partialStats.currentStreak ?? 0,
          longestStreak: partialStats.longestStreak ?? 0,
          masteredWords: partialStats.masteredWords ?? 0,
          textsReadToday: state.textsReadToday === todayStr() ? state.textsReadTodayCount : 0,
          totalXP: state.xp,
        }

        for (const achievement of ACHIEVEMENTS) {
          if (state.unlockedAchievements.includes(achievement.id)) continue
          if (achievement.check(stats)) {
            set((s) => ({
              unlockedAchievements: [...s.unlockedAchievements, achievement.id],
              pendingToast: { type: 'achievement', id: achievement.id },
            }))
            return // show one at a time
          }
        }
      },

      dismissToast: () => set({ pendingToast: null }),
    }),
    { name: 'polyglot-gamification' }
  )
)
