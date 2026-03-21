import { useTranslation } from 'react-i18next'
import type { SkillLevel } from '../types'
import { useSettingsStore } from '../stores/useSettingsStore'

const LEVELS: { value: SkillLevel; label: string; descKey: string }[] = [
  { value: 'beginner', label: 'A1-A2', descKey: 'skillLevel.beginner' },
  { value: 'intermediate', label: 'B1', descKey: 'skillLevel.intermediate' },
  { value: 'advanced', label: 'B2-C1', descKey: 'skillLevel.advanced' },
  { value: 'expert', label: 'C2', descKey: 'skillLevel.expert' },
]

export default function SkillLevelPicker() {
  const { skillLevel, setSkillLevel } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {LEVELS.map((level) => {
        const active = skillLevel === level.value
        return (
          <button
            key={level.value}
            onClick={() => setSkillLevel(level.value)}
            className={`relative rounded-[var(--t-r-btn)] py-3 px-2 text-center transition-all duration-200 overflow-hidden ${
              active
                ? 'bg-th-accent/15 ring-1 ring-th-accent/30 scale-[1.02]'
                : 'btn-surface hover:bg-th-surface-hover active:scale-[0.98]'
            }`}
          >
            <div className={`text-base font-bold font-heading ${active ? 'text-th-accent' : 'text-th-secondary'}`}>
              {level.label}
            </div>
            <div className={`text-[11px] mt-0.5 font-ui ${active ? 'text-th-accent/70' : 'text-th-muted'}`}>
              {t(level.descKey)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
