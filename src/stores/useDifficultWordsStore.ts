import { create } from 'zustand'
import type { DifficultWord, MasteryLevel } from '../types'
import * as storage from '../services/storage'
import { sm2, masteryFromRepetitions, qualityFromOutcome, SRS_DEFAULTS } from '../utils/srs'

interface DifficultWordsState {
  words: DifficultWord[]
  loading: boolean
  loadWords: () => Promise<void>
  addWord: (word: DifficultWord) => Promise<void>
  removeWord: (id: string) => Promise<void>
  toggleLearned: (id: string) => Promise<void>
  updateWord: (id: string, updates: Partial<DifficultWord>) => Promise<void>
  recordReview: (id: string, type: 'flashcard' | 'quiz', correct: boolean) => Promise<void>
  getWordsDue: () => DifficultWord[]
}

export const useDifficultWordsStore = create<DifficultWordsState>()((set, get) => ({
  words: [],
  loading: false,
  loadWords: async () => {
    // Skip if already loaded (avoid redundant IndexedDB reads on route changes)
    if (get().words.length > 0 || get().loading) return
    set({ loading: true })
    const words = await storage.getAllDifficultWords()
    set({ words, loading: false })
  },
  addWord: async (word) => {
    // Ensure new words have SRS defaults
    const withSRS: DifficultWord = {
      ...SRS_DEFAULTS,
      ...word,
    }
    await storage.saveDifficultWord(withSRS)
    set((state) => ({ words: [withSRS, ...state.words] }))
  },
  removeWord: async (id) => {
    await storage.deleteDifficultWord(id)
    set((state) => ({ words: state.words.filter((w) => w.id !== id) }))
  },
  toggleLearned: async (id) => {
    const word = get().words.find((w) => w.id === id)
    if (!word) return
    const newLearned = !word.learned
    const updates: Partial<DifficultWord> = {
      learned: newLearned,
      mastery: newLearned ? 'mastered' : 'new',
    }
    await storage.updateDifficultWord(id, updates)
    set((state) => ({
      words: state.words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  },
  updateWord: async (id, updates) => {
    await storage.updateDifficultWord(id, updates)
    set((state) => ({
      words: state.words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  },
  recordReview: async (id, type, correct) => {
    const word = get().words.find((w) => w.id === id)
    if (!word) return

    const quality = qualityFromOutcome(type, correct)
    const result = sm2(
      quality,
      word.srsRepetitions ?? 0,
      word.srsEaseFactor ?? 2.5,
      word.srsInterval ?? 0
    )

    const mastery: MasteryLevel = masteryFromRepetitions(result.repetitions)
    const now = Date.now()
    const reviewEntry = { date: now, correct }
    const history = [...(word.reviewHistory || []), reviewEntry].slice(-50)

    const updates: Partial<DifficultWord> = {
      srsRepetitions: result.repetitions,
      srsEaseFactor: result.easeFactor,
      srsInterval: result.interval,
      srsNextReview: now + result.interval * 24 * 60 * 60 * 1000,
      srsLastReview: now,
      mastery,
      learned: mastery === 'mastered',
      reviewHistory: history,
    }

    await storage.updateDifficultWord(id, updates)
    set((state) => ({
      words: state.words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }))
  },
  getWordsDue: () => {
    const now = Date.now()
    return get().words.filter(
      (w) => w.mastery !== 'mastered' && (w.srsNextReview ?? 0) <= now
    )
  },
}))
