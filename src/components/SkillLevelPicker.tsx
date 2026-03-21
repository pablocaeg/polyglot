import { useTranslation } from 'react-i18next'
import type { SkillLevel } from '../types'
import { useSettingsStore } from '../stores/useSettingsStore'

const LEVELS: { value: SkillLevel; label: string; descKey: string }[] = [
  { value: 'A1', label: 'A1', descKey: 'skillLevel.A1' },
  { value: 'A2', label: 'A2', descKey: 'skillLevel.A2' },
  { value: 'B1', label: 'B1', descKey: 'skillLevel.B1' },
  { value: 'B2', label: 'B2', descKey: 'skillLevel.B2' },
  { value: 'C1', label: 'C1', descKey: 'skillLevel.C1' },
  { value: 'C2', label: 'C2', descKey: 'skillLevel.C2' },
]

export default function SkillLevelPicker() {
  const { skillLevel, setSkillLevel } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      {LEVELS.map((level) => {
        const active = skillLevel === level.value
        return (
          <button
            key={level.value}
            onClick={() => setSkillLevel(level.value)}
            className={`relative rounded-[var(--t-r-btn)] py-2.5 px-1.5 text-center transition-all duration-200 overflow-hidden ${
              active
                ? 'bg-th-accent/15 ring-1 ring-th-accent/30 scale-[1.02]'
                : 'btn-surface hover:bg-th-surface-hover active:scale-[0.98]'
            }`}
          >
            <div className={`text-sm font-bold font-heading ${active ? 'text-th-accent' : 'text-th-secondary'}`}>
              {level.label}
            </div>
            <div className={`text-[10px] mt-0.5 font-ui ${active ? 'text-th-accent/70' : 'text-th-muted'}`}>
              {t(level.descKey)}
            </div>
          </button>
        )
      })}
    </div>
  )
}
