import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, LanguageDirection, SkillLevel, FontSize, TTSSpeed, ReadingPreferences } from '../types'

interface SettingsState {
  direction: LanguageDirection
  skillLevel: SkillLevel
  readingPreferences: ReadingPreferences
  dailyGoal: number
  setNativeLanguage: (lang: Language) => void
  setTargetLanguage: (lang: Language) => void
  setSkillLevel: (level: SkillLevel) => void
  swapLanguages: () => void
  setFontSize: (size: FontSize) => void
  setSentenceMode: (on: boolean) => void
  setTTSSpeed: (speed: TTSSpeed) => void
  setDailyGoal: (goal: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      direction: { native: 'es', target: 'pl' },
      skillLevel: 'beginner',
      readingPreferences: { fontSize: 'medium', sentenceMode: false, ttsSpeed: 'normal' },
      dailyGoal: 10,
      setNativeLanguage: (lang) =>
        set((state) => ({
          direction: {
            native: lang,
            target: state.direction.target === lang ? state.direction.native : state.direction.target,
          },
        })),
      setTargetLanguage: (lang) =>
        set((state) => ({
          direction: {
            native: state.direction.native === lang ? state.direction.target : state.direction.native,
            target: lang,
          },
        })),
      setSkillLevel: (level) => set({ skillLevel: level }),
      swapLanguages: () =>
        set((state) => ({
          direction: { native: state.direction.target, target: state.direction.native },
        })),
      setFontSize: (size) =>
        set((state) => ({
          readingPreferences: { ...state.readingPreferences, fontSize: size },
        })),
      setSentenceMode: (on) =>
        set((state) => ({
          readingPreferences: { ...state.readingPreferences, sentenceMode: on },
        })),
      setTTSSpeed: (speed) =>
        set((state) => ({
          readingPreferences: { ...state.readingPreferences, ttsSpeed: speed },
        })),
      setDailyGoal: (goal) => set({ dailyGoal: Math.max(1, goal) }),
    }),
    { name: 'polyglot-settings' }
  )
)
