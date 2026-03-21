import { useTranslation } from 'react-i18next'
import type { MasteryLevel } from '../types'

const MASTERY_STYLES: Record<MasteryLevel, string> = {
  new: 'bg-th-muted/15 text-th-muted',
  recognized: 'bg-th-warning/15 text-th-warning',
  recalled: 'bg-th-accent/15 text-th-accent',
  mastered: 'bg-th-success/15 text-th-success',
}

export default function MasteryBadge({ level }: { level: MasteryLevel }) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-block text-[10px] font-medium uppercase tracking-wider rounded-[var(--t-r-badge)] px-2 py-0.5 font-ui ${MASTERY_STYLES[level]}`}
    >
      {t(`mastery.${level}`)}
    </span>
  )
}
