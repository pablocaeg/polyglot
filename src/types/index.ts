export type Language = 'pl' | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt'

export type LanguageDirection = {
  native: Language
  target: Language
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export type MasteryLevel = 'new' | 'recognized' | 'recalled' | 'mastered'

export type TextCategory = 'culture' | 'food' | 'travel' | 'news' | 'stories' | 'daily-life' | 'other'

export type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

export type TTSSpeed = 'slow' | 'normal' | 'fast'

export type ReadingPreferences = {
  fontSize: FontSize
  sentenceMode: boolean
  ttsSpeed: TTSSpeed
}

export type WordTranslation = {
  word: string
  translation: string
  pos?: string
  grammar?: string
}

export type GeneratedText = {
  id: string
  createdAt: number
  direction: LanguageDirection
  skillLevel: SkillLevel
  topic?: string
  category?: TextCategory
  bookmarked?: boolean
  title: string
  content: string
  fullTranslation: string
  wordTranslations: WordTranslation[]
}

export type ReviewEntry = {
  date: number
  correct: boolean
}

export type DifficultWord = {
  id: string
  word: string
  translation: string
  context: string
  contextTranslation: string
  textId: string
  direction: LanguageDirection
  createdAt: number
  learned: boolean
  mastery: MasteryLevel
  note?: string
  // SRS fields (SM-2 algorithm)
  srsEaseFactor: number
  srsInterval: number
  srsRepetitions: number
  srsNextReview: number
  srsLastReview?: number
  reviewHistory?: ReviewEntry[]
}

export type DailyActivity = {
  date: string           // 'YYYY-MM-DD'
  reviewCount: number
  wordsLearned: number
  textsRead: number
  quizCorrect: number
  quizTotal: number
}

export type QueuedText = {
  id: string
  direction: LanguageDirection
  skillLevel: SkillLevel
  topic?: string
  category?: TextCategory
  generatedAt: number
  text: GeneratedText
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}
