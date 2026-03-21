import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { BookOpen, Target } from '../components/Icons'
import MasteryBadge from '../components/MasteryBadge'
import WordChat from '../components/WordChat'
import type { DifficultWord, MasteryLevel } from '../types'

type Filter = 'all' | 'due' | 'new' | 'recognized' | 'recalled' | 'mastered'

function relativeReviewDate(timestamp: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = timestamp - Date.now()
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (days <= 0) return t('difficultWords.dueNow')
  if (days === 1) return t('difficultWords.dueTomorrow')
  return t('difficultWords.dueInDays', { days })
}

export default function DifficultWords() {
  const { words, loading, loadWords, removeWord, updateWord, getWordsDue } = useDifficultWordsStore()
  const { direction } = useSettingsStore()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')
  const [chatWord, setChatWord] = useState<DifficultWord | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const dueCount = getWordsDue().length

  const filtered = words.filter((w) => {
    if (filter === 'due') return (w.srsNextReview ?? 0) <= Date.now() && w.mastery !== 'mastered'
    if (filter === 'new') return (w.mastery || 'new') === 'new'
    if (filter === 'recognized') return w.mastery === 'recognized'
    if (filter === 'recalled') return w.mastery === 'recalled'
    if (filter === 'mastered') return w.mastery === 'mastered'
    return true
  })

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('difficultWords.all'), count: words.length },
    { key: 'due', label: t('difficultWords.due'), count: dueCount },
    { key: 'new', label: t('difficultWords.new'), count: words.filter((w) => (w.mastery || 'new') === 'new').length },
    { key: 'recognized', label: t('difficultWords.recognized'), count: words.filter((w) => w.mastery === 'recognized').length },
    { key: 'recalled', label: t('difficultWords.recalled'), count: words.filter((w) => w.mastery === 'recalled').length },
    { key: 'mastered', label: t('difficultWords.mastered'), count: words.filter((w) => w.mastery === 'mastered').length },
  ]

  function startEditNote(word: DifficultWord) {
    setEditingNote(word.id)
    setNoteText(word.note || '')
  }

  async function saveNote(id: string) {
    await updateWord(id, { note: noteText || undefined })
    setEditingNote(null)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading gradient-text inline-block">{t('difficultWords.title')}</h1>
        <p className="text-th-muted text-sm mt-1 font-ui">{t('difficultWords.wordsSaved', { count: words.length })}</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-[var(--t-r-btn)] text-xs font-medium capitalize whitespace-nowrap transition-all duration-200 font-ui min-h-[36px] ${
              filter === f.key
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'btn-surface text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[11px] opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer h-20 rounded-[var(--t-r-card)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          {filter === 'mastered' ? (
            <Target className="w-12 h-12 mx-auto text-th-muted mb-3" />
          ) : (
            <BookOpen className="w-12 h-12 mx-auto text-th-muted mb-3" />
          )}
          <p className="text-th-secondary text-sm font-ui">
            {filter === 'mastered'
              ? t('difficultWords.noMasteredWords')
              : filter === 'due'
                ? t('difficultWords.noWordsDue')
                : filter === 'all'
                  ? t('difficultWords.tapWordsToSave')
                  : t('difficultWords.noFilteredWords', { filter: t(`difficultWords.${filter}`) })}
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {filtered.map((word) => (
            <div
              key={word.id}
              className={`card rounded-[var(--t-r-card)] p-4 transition-all duration-200 ${
                word.mastery === 'mastered' ? 'ring-1 ring-th-success/15' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-th-primary font-heading">{word.word}</span>
                    <span className="text-th-accent text-sm font-body">{word.translation}</span>
                    <MasteryBadge level={(word.mastery || 'new') as MasteryLevel} />
                  </div>
                  {word.context && (
                    <p className="text-th-muted text-xs mt-1.5 italic truncate font-body">
                      &ldquo;{word.context}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {word.srsNextReview && word.mastery !== 'mastered' && (
                      <span className="text-[10px] text-th-muted font-ui">
                        {relativeReviewDate(word.srsNextReview, t)}
                      </span>
                    )}
                  </div>
                  {/* Note */}
                  {editingNote === word.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveNote(word.id)}
                        placeholder={t('difficultWords.notePlaceholder')}
                        className="flex-1 text-xs bg-th-surface-hover border border-th-border rounded-[var(--t-r-input)] px-2 py-1 text-th-primary placeholder-th-muted font-ui focus:outline-none focus:border-th-accent/40"
                        autoFocus
                      />
                      <button
                        onClick={() => saveNote(word.id)}
                        className="text-xs text-th-accent font-ui font-medium px-2"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditNote(word)}
                      className="mt-1 text-[11px] text-th-muted hover:text-th-accent font-ui transition-colors text-left"
                    >
                      {word.note ? word.note : t('difficultWords.addNote')}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setChatWord(word)}
                  className="flex items-center gap-1 px-2 h-8 rounded-[var(--t-r-btn)] text-th-accent hover:bg-th-accent/10 transition-colors shrink-0"
                  aria-label={t('difficultWords.askAIAbout')}
                  title={t('wordPopup.askAI')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <span className="text-[11px] font-semibold font-ui">AI</span>
                </button>

                <button
                  onClick={() => removeWord(word.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-[var(--t-r-btn)] text-th-muted hover:text-th-danger hover:bg-th-surface-hover transition-colors shrink-0"
                  aria-label={t('difficultWords.deleteWord')}
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {chatWord && (
        <WordChat
          word={{ word: chatWord.word, translation: chatWord.translation }}
          context={chatWord.context}
          direction={chatWord.direction || direction}
          onClose={() => setChatWord(null)}
        />
      )}
    </div>
  )
}
