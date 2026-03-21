import { useTranslation } from 'react-i18next'
import { useGamificationStore } from '../stores/useGamificationStore'
import { getLevelForXP, getXPProgress } from '../utils/gamification'

export default function XPBar({ compact }: { compact?: boolean }) {
  const { xp } = useGamificationStore()
  const { t } = useTranslation()
  const level = getLevelForXP(xp)
  const progress = getXPProgress(xp)

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold font-heading text-th-accent tabular-nums">
          {t('gamification.levelShort', { level: level.level })}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-th-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-th-accent transition-all duration-700 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="text-[10px] text-th-muted font-ui tabular-nums">{xp} XP</span>
      </div>
    )
  }

  return (
    <div className="card rounded-[var(--t-r-card)] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-heading text-th-accent">
            {t('gamification.levelShort', { level: level.level })}
          </span>
          <span className="text-xs text-th-secondary font-ui">
            {t(level.nameKey)}
          </span>
        </div>
        <span className="text-xs text-th-muted font-ui tabular-nums">{xp} XP</span>
      </div>
      <div className="h-2 rounded-full bg-th-surface-hover overflow-hidden" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-th-accent transition-all duration-700 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      {progress.needed > 0 && (
        <p className="text-[10px] text-th-muted font-ui mt-1.5">
          {t('gamification.xpToNext', { current: progress.current, needed: progress.needed })}
        </p>
      )}
    </div>
  )
}
