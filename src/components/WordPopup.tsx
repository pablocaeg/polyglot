import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { WordTranslation, DifficultWord, LanguageDirection } from '../types'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { findRelatedWords } from '../utils/relatedWords'
import { translateWord } from '../services/api'
import WordChat from './WordChat'

interface WordPopupProps {
  word: WordTranslation | null
  phrase?: string
  phraseTranslation?: string
  context: string
  contextTranslation: string
  textId: string
  direction: LanguageDirection
  allWordTranslations?: WordTranslation[]
  openChat?: boolean
  onClose: () => void
}

export default function WordPopup({
  word,
  phrase,
  phraseTranslation,
  context,
  contextTranslation,
  textId,
  direction,
  allWordTranslations = [],
  openChat = false,
  onClose,
}: WordPopupProps) {
  const { addWord, words } = useDifficultWordsStore()
  const popupRef = useRef<HTMLDivElement>(null)
  const [chatOpen, setChatOpen] = useState(openChat)
  const { t } = useTranslation()

  // Auto-translate state
  const [autoTranslation, setAutoTranslation] = useState<{ translation: string; pos?: string; grammar?: string } | null>(null)
  const [translating, setTranslating] = useState(false)

  const displayWord = phrase || word?.word || ''
  const hasOriginalTranslation = !!(phrase ? phraseTranslation : word?.translation)
  const displayTranslation = phrase
    ? phraseTranslation
    : (word?.translation || autoTranslation?.translation || '')
  const displayPos = word?.pos || autoTranslation?.pos
  const displayGrammar = word?.grammar || autoTranslation?.grammar

  const isAlreadySaved = words.some(
    (w) => w.word.toLowerCase() === displayWord.toLowerCase() && w.textId === textId
  )

  // Auto-translate when word has no translation
  useEffect(() => {
    if (hasOriginalTranslation || phrase || !word?.word) return
    setTranslating(true) // eslint-disable-line react-hooks/set-state-in-effect
    translateWord(word.word, direction.target, direction.native, context)
      .then((result) => setAutoTranslation(result))
      .catch(() => {})
      .finally(() => setTranslating(false))
  }, [word?.word, hasOriginalTranslation, phrase, direction, context])

  // Related words
  const related = useMemo(() => {
    if (!word) return []
    return findRelatedWords(word.word, words, allWordTranslations)
  }, [word, words, allWordTranslations])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!word && !phrase) return null

  async function handleMarkDifficult() {
    const newWord: DifficultWord = {
      id: crypto.randomUUID(),
      word: displayWord,
      translation: displayTranslation || '',
      context,
      contextTranslation,
      textId,
      direction,
      createdAt: Date.now(),
      learned: false,
      mastery: 'new',
      srsEaseFactor: 2.5,
      srsInterval: 0,
      srsRepetitions: 0,
      srsNextReview: Date.now(),
    }
    await addWord(newWord)
  }

  const chatWord: WordTranslation = {
    word: displayWord,
    translation: displayTranslation || '',
    pos: displayPos,
    grammar: displayGrammar,
  }

  // If chat is open, only show the chat
  if (chatOpen) {
    return (
      <WordChat
        word={chatWord}
        context={context}
        direction={direction}
        onClose={() => { setChatOpen(false); onClose() }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-th-overlay/40" />

      <div
        ref={popupRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md card rounded-[var(--t-r-popup)] animate-scale-in flex flex-col"
        style={{
          maxHeight: 'min(60dvh, 480px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >

          {/* Content */}
          <div className="overflow-y-auto overscroll-contain px-5 sm:px-6 pt-1.5 sm:pt-4 pb-3 min-h-0">
            {/* Word + POS + close */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-th-primary font-heading break-words line-clamp-3">{displayWord}</h2>
                {displayPos && (
                  <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider text-th-accent bg-th-accent/10 rounded-[var(--t-r-badge)] px-2 py-0.5 border border-th-accent/15 font-ui">
                    {displayPos}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-th-muted hover:text-th-primary hover:bg-th-surface-hover transition-colors"
                aria-label={t('common.close')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Translation */}
            <div className="mt-2">
              {displayTranslation ? (
                <p className="text-th-accent text-base font-medium font-body break-words">{displayTranslation}</p>
              ) : translating ? (
                <div className="shimmer h-5 w-36 rounded" />
              ) : (
                <p className="text-th-muted text-sm italic font-body">{t('wordPopup.tapAskAI')}</p>
              )}
            </div>

            {/* Grammar */}
            {displayGrammar && (
              <p className="text-th-secondary text-xs italic font-body mt-1">{displayGrammar}</p>
            )}

            {/* Related words */}
            {related.length > 0 && (
              <div className="hidden sm:block mt-3 pt-3 border-t border-th-border">
                <p className="text-[10px] uppercase tracking-widest text-th-muted font-medium font-ui mb-1.5">
                  {t('wordPopup.relatedWords')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {related.map((r) => (
                    <span
                      key={r.word}
                      className="text-xs px-2 py-0.5 rounded-[var(--t-r-badge)] bg-th-surface-hover text-th-secondary font-ui"
                      title={r.translation}
                    >
                      {r.word} <span className="text-th-muted">= {r.translation}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions — pinned at bottom */}
          <div className="shrink-0 px-5 sm:px-6 pt-2 pb-3 sm:pb-4 flex gap-2 border-t border-th-border/50">
            <button
              onClick={handleMarkDifficult}
              disabled={isAlreadySaved}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
                isAlreadySaved
                  ? 'bg-th-surface-hover text-th-muted cursor-default'
                  : 'bg-th-warning text-th-on-accent hover:brightness-110 active:scale-[0.97]'
              }`}
            >
              {isAlreadySaved ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {t('wordPopup.alreadySaved')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {t('wordPopup.markAsDifficult')}
                </>
              )}
            </button>

            <button
              onClick={() => setChatOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-[var(--t-r-btn)] text-sm font-semibold font-ui bg-th-accent hover:bg-th-accent-hover text-th-on-accent active:scale-[0.97] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              {t('wordPopup.askAI')}
            </button>
          </div>
        </div>
      </div>
    )
}
