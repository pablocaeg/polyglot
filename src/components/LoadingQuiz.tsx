import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useTextsStore } from '../stores/useTextsStore'
import { useSettingsStore } from '../stores/useSettingsStore'

/** Minimal word shape for quiz questions */
interface QuizWord {
  word: string
  translation: string
  context?: string
  /** Already in difficult words store — no need to save on miss */
  alreadySaved?: boolean
}

/**
 * Interactive quiz shown while text is generating.
 * Pulls from difficult words first, then from all word translations
 * across previously generated texts in the target language.
 * Falls back to a fun animated loading state if no words exist at all.
 */
export default function LoadingQuiz() {
  const { words } = useDifficultWordsStore()
  const { texts } = useTextsStore()
  const { direction } = useSettingsStore()

  const quizWords = useMemo(() => {
    // Priority 1: difficult words (non-mastered)
    const difficult: QuizWord[] = words
      .filter((w) => w.mastery !== 'mastered')
      .map((w) => ({ word: w.word, translation: w.translation, context: w.context, alreadySaved: true }))

    // Priority 2: word translations from texts in the current target language
    const textWords: QuizWord[] = []
    const seen = new Set(difficult.map((w) => w.word.toLowerCase()))

    for (const text of texts) {
      if (text.direction.target !== direction.target) continue
      for (const wt of text.wordTranslations) {
        const key = wt.word.toLowerCase()
        if (!seen.has(key) && wt.translation) {
          seen.add(key)
          textWords.push({ word: wt.word, translation: wt.translation })
        }
      }
    }

    // Combine: difficult words first (so they appear more), then text words
    return [...difficult, ...textWords]
  }, [words, texts, direction.target])

  // Filter to words with both fields filled, then check for enough unique options
  const validWords = quizWords.filter((w) => w.word.trim() && w.translation.trim())
  const uniqueTranslations = new Set(validWords.map((w) => w.translation.trim().toLowerCase()))
  const uniqueWords = new Set(validWords.map((w) => w.word.trim().toLowerCase()))

  if (validWords.length < 4 || Math.min(uniqueTranslations.size, uniqueWords.size) < 4) {
    return <LoadingFallback />
  }
  return <QuizLoop words={validWords} />
}

/* ── Quiz loop: cycles through questions until generation completes ── */

function QuizLoop({ words: quizWords }: { words: QuizWord[] }) {
  const words = quizWords
  const { t } = useTranslation()
  const { addWord } = useDifficultWordsStore()
  const { direction } = useSettingsStore()
  const [current, setCurrent] = useState(() => buildQuestion(words))
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [transitioning, setTransitioning] = useState(false)

  const nextQuestion = useCallback(() => {
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(buildQuestion(words))
      setSelected(null)
      setTransitioning(false)
    }, 300)
  }, [words])

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)
    const correct = index === current.correctIndex
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))

    // Save missed words to difficult words store (only if translation exists)
    if (!correct && current.sourceWord && !current.sourceWord.alreadySaved && current.sourceWord.translation?.trim()) {
      const w = current.sourceWord
      addWord({
        id: crypto.randomUUID(),
        word: w.word,
        translation: w.translation,
        context: w.context || '',
        contextTranslation: '',
        textId: '',
        direction,
        createdAt: Date.now(),
        learned: false,
        mastery: 'new',
        srsEaseFactor: 2.5,
        srsInterval: 0,
        srsRepetitions: 0,
        srsNextReview: Date.now(),
      })
    }

    setTimeout(nextQuestion, 1200)
  }

  return (
    <div className="w-full max-w-lg mx-auto py-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[var(--t-r-badge)] bg-th-accent/10 text-th-accent text-xs font-semibold font-ui mb-3">
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {t('loadingQuiz.generatingText')}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-th-primary font-heading">
          {t('loadingQuiz.quickReview')}
        </h2>
        {score.total > 0 && (
          <p className="text-th-secondary text-sm font-ui mt-2">
            {t('loadingQuiz.correct', { correct: score.correct, total: score.total })}
          </p>
        )}
      </div>

      {/* Question card */}
      <div
        className={`transition-all duration-300 ${
          transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="card rounded-[var(--t-r-card)] p-6 sm:p-8 mb-5 text-center">
          <p className="text-[11px] font-medium text-th-muted uppercase tracking-widest mb-4 font-ui">
            {current.direction === 'toNative' ? t('loadingQuiz.whatDoesThisMean') : t('loadingQuiz.howDoYouSay')}
          </p>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-th-primary font-heading leading-tight">
            {current.question}
          </p>
          {current.context && (
            <p className="text-th-muted text-xs mt-3 italic font-body">
              &ldquo;...{current.context}...&rdquo;
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {current.options.map((option, i) => {
            let style = 'btn-surface text-th-primary hover:bg-th-surface-hover active:scale-[0.98]'
            let icon = null

            if (selected !== null) {
              if (i === current.correctIndex) {
                style = 'bg-th-success/15 border border-th-success/40 text-th-success ring-1 ring-th-success/30'
                icon = (
                  <svg className="w-5 h-5 text-th-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )
              } else if (i === selected) {
                style = 'bg-th-danger/15 border border-th-danger/40 text-th-danger ring-1 ring-th-danger/30'
                icon = (
                  <svg className="w-5 h-5 text-th-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )
              } else {
                style = 'card opacity-40 text-th-muted'
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`w-full flex items-center justify-between p-4 rounded-[var(--t-r-btn)] text-left text-base font-medium font-body transition-all duration-200 ${style}`}
              >
                <span>{option}</span>
                {icon}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Fallback: animated loading when no words available ── */

function LoadingFallback() {
  const { t } = useTranslation()
  const [dots, setDots] = useState('')
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="w-full max-w-lg mx-auto py-12 text-center animate-fade-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-[var(--t-r-card)] bg-th-accent/10 border border-th-accent/10 flex items-center justify-center">
        <svg className="w-10 h-10 text-th-accent/50 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-th-primary font-heading mb-2">
        {t('loadingQuiz.creatingText')}{dots}
      </h2>
      <p className="text-th-secondary text-sm font-body">
        {t('loadingQuiz.aiCrafting')}
      </p>
      <div className="mt-8 flex justify-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

/* ── Question builder ── */

interface Question {
  question: string
  options: string[]
  correctIndex: number
  context?: string
  direction: 'toNative' | 'toTarget'
  sourceWord?: QuizWord
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestion(words: QuizWord[]): Question {
  // Filter to words with both word and translation filled in
  const valid = words.filter((w) => w.word.trim() && w.translation.trim())
  const shuffled = shuffle(valid)
  const target = shuffled[0]

  // Randomly choose direction
  const toNative = Math.random() > 0.4 // slightly favor target→native

  const question = toNative ? target.word.trim() : target.translation.trim()
  const correctAnswer = toNative ? target.translation.trim() : target.word.trim()

  // Pick 3 distractors — unique, non-empty, different from correct answer
  const seen = new Set([correctAnswer.toLowerCase()])
  const distractors: string[] = []

  for (const w of shuffled.slice(1)) {
    if (distractors.length >= 3) break
    const candidate = (toNative ? w.translation : w.word).trim()
    if (!candidate) continue
    const key = candidate.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(candidate)
  }

  // If not enough distractors, pad (shouldn't happen since we need >=4 words)
  while (distractors.length < 3) {
    distractors.push('\u2014')
  }

  const options = shuffle([correctAnswer, ...distractors])
  const correctIndex = options.indexOf(correctAnswer)

  // Truncate context for display
  let context: string | undefined
  if (target.context) {
    const ctx = target.context
    context = ctx.length > 60 ? ctx.slice(0, 57) + '...' : ctx
  }

  return {
    question,
    options,
    correctIndex,
    context,
    direction: toNative ? 'toNative' : 'toTarget',
    sourceWord: target,
  }
}
