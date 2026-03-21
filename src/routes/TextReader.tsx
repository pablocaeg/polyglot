import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import type { GeneratedText, FontSize } from '../types'
import { getText } from '../services/storage'
import { fetchVocabulary } from '../services/api'
import { preload as preloadTTS } from '../services/speech'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useTextsStore } from '../stores/useTextsStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useActivityStore } from '../stores/useActivityStore'
import { useGamificationStore } from '../stores/useGamificationStore'
import InteractiveText from '../components/InteractiveText'
import SpeechButton from '../components/SpeechButton'

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: 'small', label: 'S' },
  { key: 'medium', label: 'M' },
  { key: 'large', label: 'L' },
  { key: 'xlarge', label: 'XL' },
]

export default function TextReader() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [text, setText] = useState<GeneratedText | null>(null)
  const [loading, setLoading] = useState(true)
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)
  const [highlightLength, setHighlightLength] = useState(0)
  const [ttsPaused, setTtsPaused] = useState(false)
  const [revealedSentences, setRevealedSentences] = useState(1)
  const [vocabLoading, setVocabLoading] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [autoReading, setAutoReading] = useState(false)
  // Which sentence TTS is currently reading (independent of revealed count)
  const [ttsSentenceIdx, setTtsSentenceIdx] = useState(0)
  const { loadWords } = useDifficultWordsStore()
  const { toggleBookmark, updateWordTranslations } = useTextsStore()
  const { readingPreferences, setFontSize, setSentenceMode, setTTSSpeed } = useSettingsStore()
  const { recordTextRead } = useActivityStore()


  useEffect(() => {
    async function load() {
      if (!id) return
      const t = await getText(id)
      if (t) {
        setText(t)
        setBookmarked(t.bookmarked ?? false)
        recordTextRead()
        useGamificationStore.getState().awardXP('textRead')
        useGamificationStore.getState().recordTextRead()

        preloadTTS(t.content, t.direction.target, readingPreferences.ttsSpeed)

        if (!t.wordTranslations || t.wordTranslations.length === 0) {
          setVocabLoading(true)
          fetchVocabulary(
            t.content,
            t.direction,
            t.skillLevel,
            (partialVocab) => {
              setText((prev) => prev ? { ...prev, wordTranslations: partialVocab } : prev)
            }
          ).then((finalVocab) => {
            if (finalVocab.length > 0) {
              updateWordTranslations(t.id, finalVocab)
            }
            setVocabLoading(false)
          })
        }
      } else {
        navigate('/')
      }
      setLoading(false)
    }
    load()
    loadWords()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, loadWords])

  const sentences = useMemo(() => {
    if (!text) return []
    return text.content.split(/(?<=[.!?])\s+/)
  }, [text])

  const translationSentences = useMemo(() => {
    if (!text) return []
    return text.fullTranslation.split(/(?<=[.!?])\s+/)
  }, [text])

  // In sentence mode, only show revealed sentences
  const displayContent = readingPreferences.sentenceMode
    ? sentences.slice(0, revealedSentences).join(' ')
    : text?.content || ''

  // When not auto-reading, sync TTS index to the latest revealed sentence
  // so clicking play starts from where the user is
  const effectiveTtsIdx = autoReading ? ttsSentenceIdx : revealedSentences - 1

  // TTS text: in sentence mode, read the current TTS sentence
  // In normal mode, read all content
  const ttsText = readingPreferences.sentenceMode
    ? sentences[effectiveTtsIdx] || ''
    : displayContent

  // Phrase selection — no-op now that WordPopup is removed
  const handlePhraseSelect = useCallback((_phrase: string) => {}, [])

  // In sentence mode, TTS reads a single sentence but InteractiveText
  // uses charIndexes relative to displayContent. Offset the highlight.
  const sentenceOffset = useMemo(() => {
    if (!readingPreferences.sentenceMode || effectiveTtsIdx <= 0) return 0
    return sentences.slice(0, effectiveTtsIdx).join(' ').length + 1
  }, [readingPreferences.sentenceMode, effectiveTtsIdx, sentences])

  const handleHighlight = useCallback((index: number | null, length: number) => {
    if (index === null) {
      setHighlightIndex(null)
    } else {
      setHighlightIndex(index + sentenceOffset)
    }
    setHighlightLength(length)
  }, [sentenceOffset])

  // When TTS ends in sentence mode, advance to next sentence and reveal it
  const handleTTSEnded = useCallback(() => {
    if (!readingPreferences.sentenceMode) return

    // Compute next from the effective index (handles both auto-read and first play)
    const currentIdx = autoReading ? ttsSentenceIdx : revealedSentences - 1
    const next = currentIdx + 1

    if (next < sentences.length) {
      setTtsSentenceIdx(next)
      setRevealedSentences((r) => Math.max(r, next + 1))
      setAutoReading(true)
    } else {
      setAutoReading(false)
    }
  }, [readingPreferences.sentenceMode, sentences.length, autoReading, ttsSentenceIdx, revealedSentences])

  const handleToggleBookmark = useCallback(() => {
    if (!id) return
    toggleBookmark(id)
    setBookmarked((b) => !b)
  }, [id, toggleBookmark])

  if (loading) {
    return (
      <div className="space-y-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="shimmer w-9 h-9 rounded-[var(--t-r-btn)]" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-5 w-48 rounded-[var(--t-r-btn)]" />
            <div className="shimmer h-3 w-24 rounded-[var(--t-r-btn)]" />
          </div>
        </div>
        <div className="shimmer h-64 rounded-[var(--t-r-card)]" />
      </div>
    )
  }

  if (!text) return null

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/')}
          className="w-11 h-11 rounded-[var(--t-r-btn)] card flex items-center justify-center text-th-muted hover:text-th-primary transition-colors shrink-0"
          aria-label={t('common.back')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-th-primary truncate font-heading leading-tight">{text.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-[var(--t-r-badge)] bg-th-accent/10 text-th-accent font-ui">
              {text.skillLevel}
            </span>
            {text.category && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-[var(--t-r-badge)] bg-th-surface-hover text-th-secondary font-ui">
                {text.category}
              </span>
            )}
          </div>
        </div>

        {/* Bookmark */}
        <button
          onClick={handleToggleBookmark}
          className={`w-10 h-10 flex items-center justify-center rounded-[var(--t-r-btn)] transition-colors shrink-0 ${
            bookmarked ? 'text-th-accent' : 'text-th-muted hover:text-th-accent'
          }`}
          aria-label={bookmarked ? t('common.removeBookmark') : t('common.bookmark')}
        >
          <svg className="w-5 h-5" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
      </div>

      {/* Text card */}
      <div className="card reading-card rounded-[var(--t-r-card)] overflow-hidden">
        {/* Toolbar — controls directly visible */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-th-border/50 space-y-2">
          {/* Top row: hint + play */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-th-muted font-ui flex items-center gap-1.5">
              {vocabLoading && (
                <svg className="w-3 h-3 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {vocabLoading ? t('textReader.loadingVocab') : t('textReader.tapToTranslate')}
            </p>
            <SpeechButton
              text={ttsText}
              lang={text.direction.target}
              onHighlight={handleHighlight}
              onPausedChange={setTtsPaused}
              onEnded={handleTTSEnded}
              onRestart={() => {
                if (readingPreferences.sentenceMode) {
                  setRevealedSentences(1)
                  setTtsSentenceIdx(0)
                  setAutoReading(true)
                }
              }}
              autoPlay={autoReading}
              inline
            />
          </div>

          {/* Controls row: font + speed + sentence mode */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {/* Font size */}
            <div className="flex gap-0.5 card rounded-[var(--t-r-btn)] p-0.5 shrink-0">
              {FONT_SIZES.map((fs) => (
                <button
                  key={fs.key}
                  onClick={() => setFontSize(fs.key)}
                  className={`w-8 h-7 rounded-[var(--t-r-btn)] text-[11px] font-semibold font-ui transition-all ${
                    readingPreferences.fontSize === fs.key
                      ? 'bg-th-accent text-th-on-accent'
                      : 'text-th-muted hover:text-th-primary'
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-th-border shrink-0" />

            {/* TTS Speed */}
            <div className="flex gap-0.5 card rounded-[var(--t-r-btn)] p-0.5 shrink-0">
              {(['slow', 'normal', 'fast'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setTTSSpeed(s)}
                  className={`px-2 h-7 rounded-[var(--t-r-btn)] text-[11px] font-semibold font-ui transition-all ${
                    readingPreferences.ttsSpeed === s
                      ? 'bg-th-accent text-th-on-accent'
                      : 'text-th-muted hover:text-th-primary'
                  }`}
                >
                  {t(`textReader.speed_${s}`)}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-th-border shrink-0" />

            {/* Sentence mode toggle */}
            <button
              onClick={() => { setSentenceMode(!readingPreferences.sentenceMode); setRevealedSentences(1); setAutoReading(false); setTtsSentenceIdx(0) }}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded-[var(--t-r-btn)] text-[11px] font-semibold font-ui transition-all shrink-0 ${
                readingPreferences.sentenceMode
                  ? 'bg-th-accent text-th-on-accent'
                  : 'card text-th-muted hover:text-th-primary'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
              {t('textReader.sentenceMode')}
            </button>
          </div>
        </div>

        {/* Text content */}
        <div className="px-5 sm:px-8 lg:px-12 py-6 lg:py-10">
          <InteractiveText
            content={displayContent}
            wordTranslations={text.wordTranslations}
            highlightIndex={highlightIndex}
            highlightLength={highlightLength}
            highlightPaused={ttsPaused}
            fontSize={readingPreferences.fontSize}
            sentenceTranslations={
              readingPreferences.sentenceMode
                ? translationSentences.slice(0, revealedSentences)
                : translationSentences
            }
            textId={text.id}
            direction={text.direction}
            onPhraseSelect={handlePhraseSelect}
          />

          {/* Sentence mode: next sentence button */}
          {readingPreferences.sentenceMode && (
            <div className="mt-5">
              {revealedSentences < sentences.length && (
                <button
                  onClick={() => setRevealedSentences((c) => c + 1)}
                  className="w-full py-2.5 rounded-[var(--t-r-btn)] bg-th-accent/10 text-sm text-th-accent font-semibold font-ui hover:bg-th-accent/15 transition-all min-h-[44px]"
                >
                  {t('textReader.nextSentence', { current: revealedSentences, total: sentences.length })}
                </button>
              )}
              {revealedSentences >= sentences.length && (
                <p className="text-center text-xs text-th-muted font-ui py-1">{t('textReader.allRevealed')}</p>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
