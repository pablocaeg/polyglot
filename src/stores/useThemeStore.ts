import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeId = 'modern' | 'editorial' | 'vintage' | 'cozy' | 'brutalist' | 'minimalist'

export interface ThemeMeta {
  id: ThemeId
  name: string
  description: string
  colors: [string, string, string] // preview swatches: bg, accent, text
}

export const THEMES: ThemeMeta[] = [
  { id: 'modern',     name: 'Modern',     description: 'Dark, vibrant, animated',     colors: ['#0b0b12', '#8b5cf6', '#ffffff'] },
  { id: 'editorial',  name: 'Editorial',  description: 'Light, serif, sophisticated', colors: ['#faf8f5', '#c41e1e', '#1a1a1a'] },
  { id: 'vintage',    name: 'Vintage',    description: 'Warm, sepia, textured',       colors: ['#171210', '#c88c3c', '#ddd0be'] },
  { id: 'cozy',       name: 'Cozy',       description: 'Warm dark, golden glow',      colors: ['#12100e', '#d4960a', '#e8dcc8'] },
  { id: 'brutalist',  name: 'Brutalist',  description: 'Raw, monospace, neon',         colors: ['#000000', '#00ff88', '#ffffff'] },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean, airy, calm',           colors: ['#f7f7f3', '#5a7052', '#2d2d2d'] },
]

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'modern',
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
    }),
    {
      name: 'polyglot-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
    }
  )
)
