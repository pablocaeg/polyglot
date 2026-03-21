import { useRef, useCallback, useMemo, useState, useEffect, memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { WordTranslation, FontSize, LanguageDirection } from '../types'
import { tokenize, type Token } from '../utils/tokenize'
import { useTextSelection } from '../hooks/useTextSelection'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import WordChat from './WordChat'

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-sm sm:text-base leading-relaxed',
  medium: 'text-lg sm:text-xl leading-relaxed sm:leading-loose',
  large: 'text-xl sm:text-2xl leading-relaxed sm:leading-loose',
  xlarge: 'text-2xl sm:text-3xl leading-loose',
}

interface InteractiveTextProps {
  content: string
  wordTranslations: WordTranslation[]
  highlightIndex: number | null
  highlightLength: number
  highlightPaused?: boolean
  fontSize?: FontSize
  sentenceTranslations?: string[]
  textId: string
  direction: LanguageDirection
  onWordTap?: (word: WordTranslation, sentence: string) => void
  onPhraseSelect: (phrase: string) => void
}

/* ── Inline tooltip shown below tapped word ── */

const InlineTooltip = memo(function InlineTooltip({
  word,
  onMore,
  onSave,
  isSaved,
  onClose,
}: {
  word: WordTranslation
  onMore: () => void
  onSave: () => void
  isSaved: boolean
  onClose: () => void
}) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  // Measure after render and shift horizontally to stay in viewport
  useEffect(() => {
    const el = tipRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 12
    if (rect.left < pad) {
      setShift(pad - rect.left)
    } else if (rect.right > window.innerWidth - pad) {
      setShift(window.innerWidth - pad - rect.right)
    }
  }, [])

  return (
    <span
      ref={tipRef}
      className="tooltip-solid absolute left-1/2 bottom-full mb-2 z-30 flex items-center gap-1.5 px-3 py-2 rounded-[var(--t-r-btn)] text-sm animate-scale-in whitespace-nowrap"
      style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Translation text */}
      <span className="text-th-accent font-medium font-body">
        {word.translation || '...'}
      </span>
      {word.pos && (
        <span className="text-[9px] text-th-muted font-ui uppercase">{word.pos}</span>
      )}

      {/* Divider */}
      <span className="w-px h-4 bg-th-border shrink-0" />

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={isSaved}
        className={`flex items-center gap-1 px-1.5 h-6 rounded-full shrink-0 transition-all active:scale-95 ${
          isSaved
            ? 'text-th-success'
            : 'text-th-warning hover:bg-th-warning/15'
        }`}
        title={isSaved ? 'Saved' : 'Save word'}
      >
        {isSaved ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="text-[10px] font-semibold font-ui">Save</span>
          </>
        )}
      </button>

      {/* Ask AI button */}
      <button
        onClick={onMore}
        className="flex items-center gap-1 px-1.5 h-6 rounded-full text-th-accent hover:bg-th-accent/15 shrink-0 transition-all active:scale-95"
        title="Ask AI"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <span className="text-[10px] font-semibold font-ui">AI</span>
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center rounded-full text-th-muted hover:text-th-primary shrink-0 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Arrow pointing down to the word */}
      <span
        className="tooltip-arrow absolute top-full w-2.5 h-2.5 rotate-45 -mt-[5px]"
        style={{ left: `calc(50% - ${shift}px)`, transform: 'translateX(-50%)' }}
      />
    </span>
  )
})

/* ── Memoized word token ─────────────────────── */

const WordToken = memo(function WordToken({
  text,
  index,
  highlighted,
  paused,
  hasTranslation,
  isSaved,
  onClick,
}: {
  text: string
  index: number
  highlighted: boolean
  paused?: boolean
  hasTranslation: boolean
  isSaved: boolean
  onClick: (text: string, index: number) => void
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      data-has-translation={hasTranslation}
      data-saved={isSaved}
      onClick={() => onClick(text, index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(text, index)
        }
      }}
      className={`word-token cursor-pointer rounded-sm px-[3px] py-[2px] ${
        paused ? 'tts-paused' : highlighted ? 'tts-active' : isSaved ? 'word-saved' : 'text-th-primary'
      }`}
    >
      {text}
    </span>
  )
})

/* ── Main component ──────────────────────────── */

export default memo(function InteractiveText({
  content,
  wordTranslations,
  highlightIndex,
  highlightLength,
  highlightPaused = false,
  fontSize = 'medium',
  sentenceTranslations = [],
  textId,
  direction,
  onWordTap,
  onPhraseSelect,
}: InteractiveTextProps) {
  const { t } = useTranslation()
  const { addWord, words } = useDifficultWordsStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const tokens = useMemo(() => tokenize(content), [content])
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number | null>(null)
  // Inline tooltip state: which token index is showing its tooltip
  const [tooltipTokenIdx, setTooltipTokenIdx] = useState<number | null>(null)
  const [tooltipWord, setTooltipWord] = useState<WordTranslation | null>(null)
  const [tooltipSentence, setTooltipSentence] = useState('')
  const [visibleTranslations, setVisibleTranslations] = useState<Set<number>>(new Set())
  const [chatWord, setChatWord] = useState<WordTranslation | null>(null)
  const [chatContext, setChatContext] = useState('')

  // Set of saved word keys for quick lookup (highlight saved words in text)
  const savedWordKeys = useMemo(() => {
    const set = new Set<string>()
    for (const w of words) {
      set.add(w.word.toLowerCase())
    }
    return set
  }, [words])

  const translationMap = useMemo(() => {
    const map = new Map<string, WordTranslation>()
    for (const wt of wordTranslations) {
      map.set(wt.word.toLowerCase(), wt)
    }
    return map
  }, [wordTranslations])

  // Precompute which token texts have a fuzzy match (for underline styling)
  const matchableWords = useMemo(() => {
    const set = new Set<string>()
    const bases = [...translationMap.keys()]
    for (const tok of tokens) {
      if (!tok.isWord) continue
      const key = tok.text.toLowerCase()
      if (translationMap.has(key)) { set.add(key); continue }
      for (const base of bases) {
        if (key.includes(base) || base.includes(key)) { set.add(key); break }
        if (key.length >= 2 && base.length >= 2) {
          let shared = 0
          for (let i = 0; i < Math.min(key.length, base.length); i++) {
            if (key[i] === base[i]) shared++; else break
          }
          if (shared >= 2) { set.add(key); break }
        }
      }
    }
    return set
  }, [tokens, translationMap])

  const sentences = useMemo(() => {
    const parts = content.split(/(?<=[.!?])\s+/)
    const result: { text: string; start: number; end: number }[] = []
    let offset = 0
    for (const part of parts) {
      result.push({ text: part, start: offset, end: offset + part.length })
      offset += part.length + 1
    }
    return result
  }, [content])

  // Pre-compute tokens grouped by sentence (avoid O(N*T) filter per render)
  const tokensBySentence = useMemo(() => {
    const groups: Token[][] = sentences.map(() => [])
    let sIdx = 0
    for (const tok of tokens) {
      while (sIdx < sentences.length - 1 && tok.index >= sentences[sIdx].end) {
        sIdx++
      }
      groups[sIdx].push(tok)
    }
    return groups
  }, [tokens, sentences])

  const findSentenceIndex = useCallback(
    (charIndex: number) => {
      for (let i = 0; i < sentences.length; i++) {
        if (charIndex >= sentences[i].start && charIndex < sentences[i].end) return i
      }
      return 0
    },
    [sentences]
  )

  useTextSelection(containerRef, onPhraseSelect)

  const handleWordClick = useCallback(
    (tokenText: string, charIndex: number) => {
      const sentIdx = findSentenceIndex(charIndex)
      setActiveSentenceIdx(sentIdx)
      const sentence = sentences[sentIdx]?.text || content

      const key = tokenText.toLowerCase()
      let wt = translationMap.get(key)
      if (!wt) {
        // Try fuzzy matching: prefix match (2+ chars) or containment
        let bestMatch: WordTranslation | undefined
        let bestScore = 0
        for (const [base, entry] of translationMap) {
          // Exact containment (e.g. "la" in "las", "el" in "del")
          if (key.includes(base) || base.includes(key)) {
            const score = Math.min(key.length, base.length)
            if (score > bestScore) { bestMatch = entry; bestScore = score }
          }
          // Shared prefix (2+ chars) — e.g. "comieron" matches "comer"
          if (key.length >= 2 && base.length >= 2) {
            let shared = 0
            for (let i = 0; i < Math.min(key.length, base.length); i++) {
              if (key[i] === base[i]) shared++; else break
            }
            if (shared >= 2 && shared > bestScore) { bestMatch = entry; bestScore = shared }
          }
        }
        if (bestMatch) wt = bestMatch
      }

      const resolved = wt || { word: tokenText, translation: '' }

      // If tapping the same word again, open AI chat
      if (tooltipTokenIdx === charIndex) {
        setTooltipTokenIdx(null)
        setTooltipWord(null)
        setChatWord(resolved)
        setChatContext(sentence)
        return
      }

      // No translation available — open AI chat directly
      if (!resolved.translation) {
        setTooltipTokenIdx(null)
        setTooltipWord(null)
        setChatWord(resolved)
        setChatContext(sentence)
        return
      }

      // Has translation — show inline tooltip
      setTooltipTokenIdx(charIndex)
      setTooltipWord(resolved)
      setTooltipSentence(sentence)
    },
    [findSentenceIndex, sentences, content, translationMap, onWordTap, tooltipTokenIdx]
  )

  const handleTooltipMore = useCallback(() => {
    if (tooltipWord) {
      setChatWord(tooltipWord)
      setChatContext(tooltipSentence)
    }
    setTooltipTokenIdx(null)
    setTooltipWord(null)
  }, [tooltipWord, tooltipSentence])

  const handleTooltipSave = useCallback(() => {
    if (!tooltipWord || !tooltipWord.translation) return
    const alreadySaved = words.some(
      (w) => w.word.toLowerCase() === tooltipWord.word.toLowerCase() && w.textId === textId
    )
    if (alreadySaved) return
    addWord({
      id: crypto.randomUUID(),
      word: tooltipWord.word,
      translation: tooltipWord.translation,
      context: tooltipSentence,
      contextTranslation: '',
      textId,
      direction,
      createdAt: Date.now(),
      learned: false,
      mastery: 'new',
      srsEaseFactor: 2.5,
      srsInterval: 0,
      srsRepetitions: 0,
      srsNextReview: Date.now(),
    })
  }, [tooltipWord, tooltipSentence, textId, direction, words, addWord])

  const handleTooltipClose = useCallback(() => {
    setTooltipTokenIdx(null)
    setTooltipWord(null)
    setActiveSentenceIdx(null)
  }, [])

  const toggleSentenceTranslation = useCallback((idx: number) => {
    setVisibleTranslations((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const toggleAllTranslations = useCallback(() => {
    setVisibleTranslations((prev) =>
      prev.size === sentences.length ? new Set() : new Set(sentences.map((_, i) => i))
    )
  }, [sentences])

  const hasSelection = activeSentenceIdx !== null
  const hasTranslations = sentenceTranslations.length > 0
  const allVisible = visibleTranslations.size === sentences.length

  return (
    <div>
      <div
        ref={containerRef}
        className={`text-container ${hasSelection ? 'has-selection' : ''} ${FONT_SIZE_CLASSES[fontSize]} tracking-wide font-body`}
      >
        {sentences.map((_sentence, sIdx) => {
          const sentenceTokens = tokensBySentence[sIdx]
          const isActiveSentence = activeSentenceIdx === sIdx
          const translationVisible = visibleTranslations.has(sIdx)
          const translation = sentenceTranslations[sIdx]

          return (
            <span key={sIdx} className="sentence-wrapper">
              <span
                className={`sentence-group ${isActiveSentence ? 'active-sentence' : ''} ${
                  hasTranslations ? 'cursor-pointer' : ''
                }`}
                onDoubleClick={() => hasTranslations && toggleSentenceTranslation(sIdx)}
              >
                {sentenceTokens.map((token, i) => {
                  if (!token.isWord) {
                    return <span key={`${sIdx}-${i}`}>{token.text}</span>
                  }

                  const isHighlighted =
                    highlightIndex !== null &&
                    token.index >= highlightIndex &&
                    token.index < highlightIndex + highlightLength

                  const isTooltipTarget = tooltipTokenIdx === token.index

                  const isWordSaved = isTooltipTarget && tooltipWord
                    ? words.some((w) => w.word.toLowerCase() === tooltipWord.word.toLowerCase() && w.textId === textId)
                    : false

                  const isTokenSaved = savedWordKeys.has(token.text.toLowerCase())

                  return (
                    <span key={`${sIdx}-${i}`} className={isTooltipTarget ? 'relative inline-block' : undefined}>
                      <WordToken
                        text={token.text}
                        index={token.index}
                        highlighted={isHighlighted || isTooltipTarget}
                        paused={isHighlighted && highlightPaused}
                        hasTranslation={matchableWords.has(token.text.toLowerCase())}
                        isSaved={isTokenSaved}
                        onClick={handleWordClick}
                      />
                      {isTooltipTarget && tooltipWord && (
                        <InlineTooltip
                          word={tooltipWord}
                          onMore={handleTooltipMore}
                          onSave={handleTooltipSave}
                          isSaved={isWordSaved}
                          onClose={handleTooltipClose}
                        />
                      )}
                    </span>
                  )
                })}
              </span>

              {translationVisible && translation && (
                <span
                  className="block my-2 py-1.5 px-3 text-sm text-th-accent/80 italic font-body border-l-2 border-th-accent/30 bg-th-accent/5 rounded-r-[var(--t-r-btn)] animate-fade-in cursor-pointer hover:bg-th-accent/8 transition-colors"
                  onClick={() => toggleSentenceTranslation(sIdx)}
                  role="button"
                  tabIndex={0}
                >
                  {translation}
                </span>
              )}

              {sIdx < sentences.length - 1 && <span> </span>}
            </span>
          )
        })}
      </div>

      {hasTranslations && (
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={toggleAllTranslations}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all active:scale-[0.97] ${
              allVisible
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'bg-th-accent text-th-on-accent hover:bg-th-accent-hover btn-glow'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {allVisible ? t('textReader.hideTranslations') : t('textReader.showTranslations')}
          </button>
          {!allVisible && visibleTranslations.size === 0 && (
            <span className="text-[11px] text-th-muted font-ui">{t('textReader.doubleTapHint')}</span>
          )}
        </div>
      )}

      {chatWord && (
        <WordChat
          word={chatWord}
          context={chatContext}
          direction={direction}
          onClose={() => { setChatWord(null); setChatContext('') }}
        />
      )}
    </div>
  )
})
