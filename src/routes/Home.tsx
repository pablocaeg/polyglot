import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import LanguagePairSelector from '../components/LanguagePairSelector'
import SkillLevelPicker from '../components/SkillLevelPicker'
import StreakBanner from '../components/StreakBanner'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useTextsStore } from '../stores/useTextsStore'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { generateText, fetchVocabulary } from '../services/api'
import { preload as preloadTTS } from '../services/speech'
// import { suggestLevelChange } from '../utils/difficultyAdvisor'
import { FlagPL, FlagES, FlagEN, FlagFR, FlagDE, FlagIT, FlagPT, FlagNL, BookStack } from '../components/Icons'
import LoadingQuiz from '../components/LoadingQuiz'
import type { TextCategory } from '../types'

const FLAG: Record<string, typeof FlagPL> = {
  pl: FlagPL, es: FlagES, en: FlagEN,
  fr: FlagFR, de: FlagDE, it: FlagIT, pt: FlagPT, nl: FlagNL,
}

const CATEGORY_KEYS: TextCategory[] = ['culture', 'food', 'travel', 'news', 'stories', 'daily-life']

type TextFilter = 'all' | 'bookmarked'

export default function Home() {
  const [topic, setTopic] = useState('')
  const [category, setCategory] = useState<TextCategory | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [textFilter, setTextFilter] = useState<TextFilter>('all')
  const { direction, skillLevel } = useSettingsStore()
  const { texts, loadTexts, addText, removeText, toggleBookmark } = useTextsStore()
  const { words, loadWords, getWordsDue } = useDifficultWordsStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    loadTexts()
    loadWords()
  }, [loadTexts, loadWords])

  const dueCount = useMemo(() => getWordsDue().length, [words, getWordsDue])

  const filteredTexts = textFilter === 'bookmarked'
    ? texts.filter((t) => t.bookmarked)
    : texts

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const text = await generateText(direction, skillLevel, topic || undefined, category || undefined)
      await addText(text)
      // Start preloading TTS and vocab before navigating
      preloadTTS(text.content, text.direction.target)
      fetchVocabulary(text.content, text.direction, text.skillLevel).then((vocab) => {
        if (vocab.length > 0) {
          useTextsStore.getState().updateWordTranslations(text.id, vocab)
        }
      })
      navigate(`/text/${text.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('home.failedToGenerate'))
    } finally {
      setGenerating(false)
    }
  }

  if (generating) {
    return <LoadingQuiz />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Spacer — desktop only (mobile has its own top bar) */}
      <div className="hidden lg:block h-2" />

      {/* Streak */}
      <StreakBanner />

      {/* Due words CTA */}
      {dueCount > 0 && (
        <button
          onClick={() => navigate('/practice/flashcards')}
          className="w-full rounded-[var(--t-r-card)] bg-th-accent p-4 flex items-center gap-3 hover:brightness-110 transition-all text-left active:scale-[0.99]"
        >
          <div className="w-10 h-10 rounded-[var(--t-r-btn)] bg-white/15 flex items-center justify-center text-th-on-accent shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-th-on-accent font-heading">
              {t('home.wordsDueForReview', { count: dueCount })}
            </p>
            <p className="text-[11px] text-th-on-accent/70 font-ui">{t('home.tapToReview')}</p>
          </div>
          <svg className="w-5 h-5 text-th-on-accent/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Settings */}
      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
        <LanguagePairSelector />
        <div className="card rounded-[var(--t-r-card)] p-5 flex flex-col justify-center">
          <p className="text-[11px] uppercase tracking-widest text-th-muted font-medium font-ui mb-3">{t('skillLevel.title')}</p>
          <SkillLevelPicker />
        </div>
      </div>

      {/* Generate */}
      <div className="card rounded-[var(--t-r-card)] p-5 space-y-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t('home.topicPlaceholder')}
          className="w-full bg-th-surface-hover border border-th-border rounded-[var(--t-r-input)] px-4 py-3 text-th-primary placeholder-th-muted text-sm font-ui focus:outline-none focus:border-th-accent/40 focus:ring-1 focus:ring-th-accent/20 transition-all"
        />

        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setCategory(category === key ? null : key)}
              className={`px-3 py-1 rounded-[var(--t-r-badge)] text-xs font-medium font-ui transition-all ${
                category === key
                  ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                  : 'bg-th-surface-hover text-th-secondary hover:text-th-primary'
              }`}
            >
              {t(`home.category.${key}`)}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 rounded-[var(--t-r-btn)] font-semibold text-sm font-ui transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-th-accent text-th-on-accent hover:bg-th-accent-hover btn-glow"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('home.generating')}
            </span>
          ) : (
            t('home.generateText')
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-[var(--t-r-card)] bg-th-danger/10 border border-th-danger/20 text-th-danger text-sm p-4 animate-fade-in font-ui">
          {error}
        </div>
      )}

      {/* Recent texts */}
      {texts.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-th-muted uppercase tracking-widest font-ui">
              {textFilter === 'bookmarked' ? t('home.bookmarked') : t('home.recentTexts')}
            </h2>
            <div className="flex gap-1.5">
              {(['all', 'bookmarked'] as TextFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setTextFilter(f)}
                  className={`px-2 py-0.5 rounded-[var(--t-r-badge)] text-[10px] font-medium font-ui capitalize transition-all ${
                    textFilter === f
                      ? 'bg-th-accent/15 text-th-accent'
                      : 'text-th-muted hover:text-th-primary'
                  }`}
                >
                  {f === 'bookmarked' ? `\u2605 ${t('home.saved')}` : t('home.all')}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 stagger">
            {filteredTexts.map((text) => {
              const TargetFlag = FLAG[text.direction.target]
              return (
                <div
                  key={text.id}
                  className="card card-lift rounded-[var(--t-r-card)] p-4 flex items-center gap-3 group transition-all"
                  onClick={() => navigate(`/text/${text.id}`)}
                >
                  <div className="w-10 h-10 rounded-[var(--t-r-btn)] bg-th-surface-hover flex items-center justify-center shrink-0">
                    <TargetFlag className="w-6 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-th-primary truncate font-heading">{text.title}</p>
                      {text.bookmarked && <span className="text-th-accent text-xs shrink-0">{'\u2605'}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-[var(--t-r-badge)] bg-th-accent/10 text-th-accent font-ui">
                        {text.skillLevel}
                      </span>
                      {text.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-[var(--t-r-badge)] bg-th-surface-hover text-th-secondary font-ui">
                          {text.category}
                        </span>
                      )}
                      <span className="text-[11px] text-th-muted font-ui">
                        {new Date(text.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(text.id) }}
                    className={`w-10 h-10 flex items-center justify-center rounded-[var(--t-r-btn)] transition-all shrink-0 ${
                      text.bookmarked
                        ? 'text-th-accent'
                        : 'text-th-muted hover:text-th-accent lg:opacity-0 lg:group-hover:opacity-100'
                    }`}
                    aria-label={text.bookmarked ? t('common.removeBookmark') : t('common.bookmarkText')}
                  >
                    <svg className="w-5 h-5" fill={text.bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeText(text.id) }}
                    className="w-10 h-10 flex items-center justify-center rounded-[var(--t-r-btn)] text-th-muted hover:text-th-danger transition-all shrink-0 lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label={t('home.deleteText')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {texts.length === 0 && !generating && (
        <div className="text-center py-8 animate-fade-in">
          <BookStack className="w-12 h-12 mx-auto text-th-muted mb-3" />
          <p className="text-th-muted text-sm font-ui">{t('home.noTextsYet')}</p>
        </div>
      )}
    </div>
  )
}
