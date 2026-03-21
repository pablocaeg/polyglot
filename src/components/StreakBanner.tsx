import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useActivityStore } from '../stores/useActivityStore'
import { useSettingsStore } from '../stores/useSettingsStore'

export default function StreakBanner() {
  const { today, streak, loaded, loadActivity } = useActivityStore()
  const { dailyGoal } = useSettingsStore()
  const { t } = useTranslation()

  useEffect(() => {
    if (!loaded) loadActivity()
  }, [loaded, loadActivity])

  if (!loaded) return null

  const progress = Math.min(today.reviewCount, dailyGoal)

  return (
    <div className="card rounded-[var(--t-r-card)] p-4 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-th-warning shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-th-primary font-heading">
            {streak > 0 ? t('streak.dayStreak', { count: streak }) : t('streak.startStreak')}
          </p>
          <p className="text-[11px] text-th-muted font-ui">
            {t('streak.reviewsToday', { progress, goal: dailyGoal })}
          </p>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-2 rounded-full bg-th-surface-hover overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={dailyGoal}>
          <div
            className="h-full rounded-full bg-th-accent transition-all duration-500 ease-out"
            style={{ width: `${(progress / dailyGoal) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
