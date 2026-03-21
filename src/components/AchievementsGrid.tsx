import { useTranslation } from 'react-i18next'
import { useGamificationStore } from '../stores/useGamificationStore'
import { ACHIEVEMENTS } from '../utils/gamification'
import AchievementBadge from './AchievementBadges'

export default function AchievementsGrid() {
  const { unlockedAchievements } = useGamificationStore()
  const { t } = useTranslation()

  const unlocked = unlockedAchievements.length
  const total = ACHIEVEMENTS.length

  return (
    <div className="card rounded-[var(--t-r-card)] p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-th-muted font-ui uppercase tracking-widest">
          {t('gamification.achievements')}
        </p>
        <span className="text-xs text-th-accent font-semibold font-ui tabular-nums">
          {unlocked}/{total}
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedAchievements.includes(achievement.id)
          return (
            <div
              key={achievement.id}
              className="flex flex-col items-center gap-1.5"
              title={isUnlocked ? t(achievement.nameKey) : '???'}
            >
              <AchievementBadge id={achievement.id} size={44} locked={!isUnlocked} />
              <span className={`text-[9px] font-ui text-center leading-tight ${
                isUnlocked ? 'text-th-secondary' : 'text-th-muted'
              }`}>
                {isUnlocked ? t(achievement.nameKey) : '???'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
