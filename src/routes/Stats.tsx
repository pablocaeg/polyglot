import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useActivityStore } from '../stores/useActivityStore'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useTextsStore } from '../stores/useTextsStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import XPBar from '../components/XPBar'
import AchievementsGrid from '../components/AchievementsGrid'
import type { MasteryLevel } from '../types'

const MASTERY_META: Record<MasteryLevel, { color: string; bg: string }> = {
  new: { color: 'text-th-muted', bg: 'bg-th-muted/40' },
  recognized: { color: 'text-th-warning', bg: 'bg-th-warning' },
  recalled: { color: 'text-th-accent', bg: 'bg-th-accent' },
  mastered: { color: 'text-th-success', bg: 'bg-th-success' },
}

export default function Stats() {
  const { history, streak, today, loaded, loadActivity } = useActivityStore()
  const { words, loadWords } = useDifficultWordsStore()
  const { texts, loadTexts } = useTextsStore()
  const { dailyGoal } = useSettingsStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loaded) loadActivity()
    loadWords()
    loadTexts()
  }, [loaded, loadActivity, loadWords, loadTexts])

  const totalWords = words.length
  const masteryBreakdown = useMemo(() => {
    const counts: Record<MasteryLevel, number> = { new: 0, recognized: 0, recalled: 0, mastered: 0 }
    for (const w of words) counts[(w.mastery || 'new') as MasteryLevel]++
    return counts
  }, [words])

  const weeklyData = useMemo(() => {
    const days: { date: string; count: number; label: string }[] = []
    const dayNames = t('stats.dayNames', { returnObjects: true }) as string[]
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const day = history.find((h) => h.date === key)
      days.push({ date: key, count: day?.reviewCount || 0, label: dayNames[d.getDay()] })
    }
    return days
  }, [history, t])

  const maxReviews = Math.max(...weeklyData.map((d) => d.count), 1)
  const totalReviews = weeklyData.reduce((sum, d) => sum + d.count, 0)

  const quizAccuracy = useMemo(() => {
    const allReviews = words
      .flatMap((w) => w.reviewHistory || [])
      .sort((a, b) => b.date - a.date)
      .slice(0, 50)
    if (allReviews.length === 0) return null
    return Math.round((allReviews.filter((r) => r.correct).length / allReviews.length) * 100)
  }, [words])

  const longestStreak = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
    let longest = 0, current = 0, prevDate: Date | null = null
    for (const day of sorted) {
      if (day.reviewCount === 0) { current = 0; prevDate = null; continue }
      const date = new Date(day.date)
      if (prevDate) {
        const diff = (date.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
        current = diff <= 1 ? current + 1 : 1
      } else { current = 1 }
      longest = Math.max(longest, current)
      prevDate = date
    }
    return longest
  }, [history])

  // Daily progress
  const dailyProgress = Math.min(today.reviewCount / dailyGoal, 1)
  const dailyRemaining = Math.max(0, dailyGoal - today.reviewCount)

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading gradient-text inline-block">{t('stats.title')}</h1>
        <p className="text-th-muted text-sm mt-1 font-ui">{t('stats.subtitle')}</p>
      </div>

      {/* XP & Level */}
      <XPBar />

      {/* Hero: Today's progress */}
      <div className="card rounded-[var(--t-r-card)] p-6 flex items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-20 h-20 lg:w-24 lg:h-24 shrink-0">
          <svg className="w-20 h-20 lg:w-24 lg:h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-th-surface-hover" />
            <circle
              cx="40" cy="40" r="34" fill="none" strokeWidth="6"
              className="stroke-th-accent"
              strokeLinecap="round"
              strokeDasharray={`${dailyProgress * 213.6} 213.6`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-th-primary font-heading tabular-nums">{today.reviewCount}</span>
            <span className="text-[9px] text-th-muted font-ui">/{dailyGoal}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-th-primary font-heading">
            {dailyRemaining > 0 ? t('stats.reviewsToGo', { count: dailyRemaining }) : t('stats.dailyGoalReached')}
          </p>
          <p className="text-xs text-th-muted font-ui mt-0.5">
            {today.textsRead > 0 && t('stats.textsReadToday', { count: today.textsRead })}
            {today.textsRead > 0 && today.wordsLearned > 0 && ' \u00b7 '}
            {today.wordsLearned > 0 && t('stats.wordsLearned', { count: today.wordsLearned })}
            {today.textsRead === 0 && today.wordsLearned === 0 && t('stats.startReading')}
          </p>

          {dailyRemaining > 0 && (
            <button
              onClick={() => navigate('/practice/flashcards')}
              className="mt-3 px-4 py-1.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-xs font-semibold font-ui hover:brightness-110 active:scale-[0.97] transition-all"
            >
              {t('stats.startReviewing')}
            </button>
          )}
        </div>
      </div>

      {/* Streak + Accuracy row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card rounded-[var(--t-r-card)] p-4 text-center">
          <p className="text-2xl font-bold text-th-accent font-heading tabular-nums">{streak}</p>
          <p className="text-[10px] text-th-muted font-ui mt-1">{t('stats.currentStreak')}</p>
        </div>
        <div className="card rounded-[var(--t-r-card)] p-4 text-center">
          <p className="text-2xl font-bold text-th-primary font-heading tabular-nums">{longestStreak}</p>
          <p className="text-[10px] text-th-muted font-ui mt-1">{t('stats.bestStreak')}</p>
        </div>
        <div className="card rounded-[var(--t-r-card)] p-4 text-center">
          <p className="text-2xl font-bold text-th-primary font-heading tabular-nums">
            {quizAccuracy !== null ? `${quizAccuracy}%` : '\u2014'}
          </p>
          <p className="text-[10px] text-th-muted font-ui mt-1">{t('stats.reviewAccuracy')}</p>
        </div>
      </div>

      {/* Word mastery donut */}
      {totalWords > 0 && (
        <div className="card rounded-[var(--t-r-card)] p-5">
          <p className="text-xs text-th-muted font-ui uppercase tracking-widest mb-4">{t('stats.wordMastery')}</p>
          <div className="flex items-center gap-6">
            {/* Donut chart */}
            <div className="relative w-24 h-24 lg:w-28 lg:h-28 shrink-0">
              <svg className="w-24 h-24 lg:w-28 lg:h-28 -rotate-90" viewBox="0 0 96 96">
                {(() => {
                  const levels: MasteryLevel[] = ['mastered', 'recalled', 'recognized', 'new']
                  let offset = 0
                  const circumference = 2 * Math.PI * 40
                  return levels.map((level) => {
                    const pct = masteryBreakdown[level] / totalWords
                    const dash = pct * circumference
                    const el = (
                      <circle
                        key={level}
                        cx="48" cy="48" r="40" fill="none" strokeWidth="8"
                        className={`${MASTERY_META[level].bg.replace('bg-', 'stroke-')}`}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                      />
                    )
                    offset += dash
                    return el
                  })
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-th-primary font-heading">{totalWords}</span>
                <span className="text-[9px] text-th-muted font-ui">{t('stats.wordsLabel')}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2.5">
              {(['mastered', 'recalled', 'recognized', 'new'] as MasteryLevel[]).map((level) => {
                const count = masteryBreakdown[level]
                const pct = totalWords > 0 ? Math.round((count / totalWords) * 100) : 0
                return (
                  <div key={level} className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${MASTERY_META[level].bg}`} />
                    <span className="text-xs text-th-secondary font-ui flex-1">{t(`mastery.${level}`)}</span>
                    <span className="text-xs font-semibold text-th-primary font-heading tabular-nums">{count}</span>
                    <span className="text-[10px] text-th-muted font-ui w-8 text-right tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity chart */}
      <div className="card rounded-[var(--t-r-card)] p-5">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-xs text-th-muted font-ui uppercase tracking-widest">{t('stats.reviewsChart')}</p>
          <p className="text-xs text-th-secondary font-ui tabular-nums">{t('stats.totalReviews', { count: totalReviews })}</p>
        </div>
        <div className="flex items-end gap-[3px] h-32">
          {weeklyData.map((day, i) => {
            const pct = day.count > 0 ? Math.max(6, (day.count / maxReviews) * 100) : 0
            const isToday = i === weeklyData.length - 1
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                {day.count > 0 && (
                  <span className="text-[8px] text-th-muted font-ui tabular-nums">{day.count}</span>
                )}
                <div
                  className={`w-full rounded-t transition-all ${
                    isToday
                      ? 'bg-th-accent'
                      : day.count > 0
                        ? 'bg-th-accent/50'
                        : 'bg-th-border/50'
                  }`}
                  style={{ height: day.count > 0 ? `${pct}%` : '3px' }}
                />
                <span className={`text-[9px] font-ui ${isToday ? 'text-th-accent font-semibold' : 'text-th-muted'}`}>
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card rounded-[var(--t-r-card)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--t-r-btn)] bg-th-accent/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-th-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-th-primary font-heading tabular-nums">{texts.length}</p>
            <p className="text-[10px] text-th-muted font-ui">{t('stats.textsRead')}</p>
          </div>
        </div>
        <div className="card rounded-[var(--t-r-card)] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--t-r-btn)] bg-th-warning/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-th-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-th-primary font-heading tabular-nums">{totalWords}</p>
            <p className="text-[10px] text-th-muted font-ui">{t('stats.wordsSaved')}</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      <AchievementsGrid />
    </div>
  )
}
