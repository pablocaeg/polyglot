import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useOfflineQueueStore } from '../stores/useOfflineQueueStore'
import { generateText } from '../services/api'
import { exportToCSV, exportToAnki } from '../utils/export'
import type { FontSize } from '../types'

const FONT_SIZES: { key: FontSize; labelKey: string }[] = [
  { key: 'small', labelKey: 'settings.fontSmall' },
  { key: 'medium', labelKey: 'settings.fontMedium' },
  { key: 'large', labelKey: 'settings.fontLarge' },
  { key: 'xlarge', labelKey: 'settings.fontXLarge' },
]

export default function Settings() {
  const { readingPreferences, dailyGoal, setFontSize, setSentenceMode, setDailyGoal, direction, skillLevel } = useSettingsStore()
  const { words } = useDifficultWordsStore()
  const { queue, addToQueue } = useOfflineQueueStore()
  const { t } = useTranslation()
  const [prefetching, setPrefetching] = useState(false)
  const [prefetchCount, setPrefetchCount] = useState(0)

  async function handlePrefetch() {
    setPrefetching(true)
    setPrefetchCount(0)
    const count = 3
    for (let i = 0; i < count; i++) {
      try {
        const text = await generateText(direction, skillLevel)
        await addToQueue({
          id: crypto.randomUUID(),
          direction,
          skillLevel,
          generatedAt: Date.now(),
          text,
        })
        setPrefetchCount((c) => c + 1)
      } catch {
        break
      }
    }
    setPrefetching(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading gradient-text inline-block">{t('settings.title')}</h1>
        <p className="text-th-muted text-sm mt-1 font-ui">{t('settings.subtitle')}</p>
      </div>

      {/* Reading preferences */}
      <div className="card rounded-[var(--t-r-card)] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-th-primary font-heading">{t('settings.reading')}</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-th-secondary font-ui">{t('settings.fontSize')}</span>
          <div className="flex gap-1">
            {FONT_SIZES.map((fs) => (
              <button
                key={fs.key}
                onClick={() => setFontSize(fs.key)}
                className={`px-3 py-1.5 rounded-[var(--t-r-btn)] text-xs font-medium font-ui transition-all ${
                  readingPreferences.fontSize === fs.key
                    ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                    : 'bg-th-surface-hover text-th-secondary hover:text-th-primary'
                }`}
              >
                {t(fs.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-th-secondary font-ui">{t('settings.sentenceMode')}</span>
            <p className="text-[11px] text-th-muted font-ui">{t('settings.sentenceModeDesc')}</p>
          </div>
          <button
            onClick={() => setSentenceMode(!readingPreferences.sentenceMode)}
            role="switch"
            aria-checked={readingPreferences.sentenceMode}
            className={`relative w-12 h-7 rounded-full transition-all shrink-0 ${
              readingPreferences.sentenceMode ? 'bg-th-accent' : 'bg-th-surface-hover border border-th-border'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full transition-all ${
              readingPreferences.sentenceMode
                ? 'left-6 bg-th-on-accent'
                : 'left-1 bg-th-muted'
            }`} />
          </button>
        </div>
      </div>

      {/* Daily goal */}
      <div className="card rounded-[var(--t-r-card)] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-th-primary font-heading">{t('settings.dailyGoal')}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-th-secondary font-ui">{t('settings.reviewsPerDay')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDailyGoal(dailyGoal - 5)}
              className="w-10 h-10 rounded-[var(--t-r-btn)] btn-surface text-th-secondary hover:text-th-primary flex items-center justify-center transition-colors"
              aria-label="Decrease goal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="text-xl font-bold text-th-primary font-heading w-12 text-center tabular-nums">{dailyGoal}</span>
            <button
              onClick={() => setDailyGoal(dailyGoal + 5)}
              className="w-10 h-10 rounded-[var(--t-r-btn)] btn-surface text-th-secondary hover:text-th-primary flex items-center justify-center transition-colors"
              aria-label="Increase goal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="card rounded-[var(--t-r-card)] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-th-primary font-heading">{t('settings.exportDictionary')}</h2>
        <p className="text-[11px] text-th-muted font-ui">{t('settings.wordsForExport', { count: words.length })}</p>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(words)}
            disabled={words.length === 0}
            className="flex-1 py-2.5 min-h-[44px] rounded-[var(--t-r-btn)] btn-surface text-sm font-semibold font-ui text-th-primary hover:bg-th-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {t('settings.exportCSV')}
          </button>
          <button
            onClick={() => exportToAnki(words)}
            disabled={words.length === 0}
            className="flex-1 py-2.5 min-h-[44px] rounded-[var(--t-r-btn)] btn-surface text-sm font-semibold font-ui text-th-primary hover:bg-th-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {t('settings.exportAnki')}
          </button>
        </div>
      </div>

      {/* Offline queue */}
      <div className="card rounded-[var(--t-r-card)] p-5 space-y-3">
        <h2 className="text-sm font-semibold text-th-primary font-heading">{t('settings.offlineReading')}</h2>
        <p className="text-[11px] text-th-muted font-ui">
          {t(queue.length === 1 ? 'settings.textPreGenerated' : 'settings.textsPreGenerated', { count: queue.length })}
        </p>
        <button
          onClick={handlePrefetch}
          disabled={prefetching}
          className="w-full py-2.5 min-h-[44px] rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-sm font-semibold font-ui hover:bg-th-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {prefetching
            ? t('settings.generatingPrefetch', { current: prefetchCount })
            : t('settings.preGenerate')}
        </button>
      </div>
    </div>
  )
}
