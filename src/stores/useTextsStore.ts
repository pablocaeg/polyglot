import { create } from 'zustand'
import type { GeneratedText, TextCategory, WordTranslation } from '../types'
import * as storage from '../services/storage'

interface TextsState {
  texts: GeneratedText[]
  loading: boolean
  loadTexts: () => Promise<void>
  addText: (text: GeneratedText) => Promise<void>
  removeText: (id: string) => Promise<void>
  toggleBookmark: (id: string) => Promise<void>
  updateCategory: (id: string, category: TextCategory) => Promise<void>
  updateWordTranslations: (id: string, wordTranslations: WordTranslation[]) => Promise<void>
}

export const useTextsStore = create<TextsState>()((set, get) => ({
  texts: [],
  loading: false,
  loadTexts: async () => {
    if (get().texts.length > 0 || get().loading) return
    set({ loading: true })
    const texts = await storage.getAllTexts()
    set({ texts, loading: false })
  },
  addText: async (text) => {
    await storage.saveText(text)
    set((state) => ({ texts: [text, ...state.texts] }))
  },
  removeText: async (id) => {
    await storage.deleteText(id)
    set((state) => ({ texts: state.texts.filter((t) => t.id !== id) }))
  },
  toggleBookmark: async (id) => {
    const text = get().texts.find((t) => t.id === id)
    if (!text) return
    const bookmarked = !text.bookmarked
    await storage.updateText(id, { bookmarked })
    set((state) => ({
      texts: state.texts.map((t) => (t.id === id ? { ...t, bookmarked } : t)),
    }))
  },
  updateCategory: async (id, category) => {
    await storage.updateText(id, { category })
    set((state) => ({
      texts: state.texts.map((t) => (t.id === id ? { ...t, category } : t)),
    }))
  },
  updateWordTranslations: async (id, wordTranslations) => {
    await storage.updateText(id, { wordTranslations })
    set((state) => ({
      texts: state.texts.map((t) => (t.id === id ? { ...t, wordTranslations } : t)),
    }))
  },
}))
