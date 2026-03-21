import type { AchievementId } from '../utils/gamification'

interface BadgeProps {
  size?: number
  locked?: boolean
  className?: string
}

function B({ size = 48, locked, className, children }: BadgeProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      className={className}
      style={locked ? { filter: 'saturate(0) opacity(0.18)' } : undefined}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/* ── Shapes ── */

const shield = "M32 3L7 16v18c0 15 11 23 25 27 14-4 25-12 25-27V16L32 3z"
const hex = "M32 3L57 18v28L32 61 7 46V18L32 3z"

/* ── 1. First Words — quill pen on shield ── */
function FirstWords(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={shield} fill="#7c3aed" />
      <path d={shield} fill="#000" opacity="0.1" />
      <path d="M32 3L7 16v18c0 15 11 23 25 27" fill="#8b5cf6" />
      {/* Quill */}
      <path d="M38 16c-6 6-10 14-12 22l2 1c4-6 9-12 16-15-2 0-4-2-6-4l4-4z" fill="#f5f3ff" />
      <path d="M26 38l2 1" stroke="#f5f3ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 12c-1 1-2 3-4 4l4 4c1-2 2-3 3-4a3 3 0 00-3-4z" fill="#ddd6fe" />
    </B>
  )
}

/* ── 2. Bookworm — open book, hexagon ── */
function Bookworm(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={hex} fill="#0891b2" />
      <path d={hex} fill="#000" opacity="0.08" />
      <path d="M32 3L57 18v28L32 61" fill="#06b6d4" />
      {/* Open book */}
      <path d="M32 22v22" stroke="#e0f2fe" strokeWidth="1.5" />
      <path d="M32 22c-3-3-7-5-13-5v22c6 0 10 2 13 5" fill="#e0f2fe" opacity="0.85" />
      <path d="M32 22c3-3 7-5 13-5v22c-6 0-10 2-13 5" fill="#fff" opacity="0.65" />
      {/* Text lines */}
      <path d="M22 23h7M22 27h5M22 31h6" stroke="#0891b2" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </B>
  )
}

/* ── 3. Perfect Round — bullseye, medal shape ── */
function PerfectRound(p: BadgeProps) {
  return (
    <B {...p}>
      {/* Ribbon */}
      <path d="M20 50l-5 11 7-3 2 5 4-9" fill="#b45309" opacity="0.5" />
      <path d="M44 50l5 11-7-3-2 5-4-9" fill="#b45309" opacity="0.5" />
      <circle cx="32" cy="30" r="24" fill="#d97706" />
      <circle cx="32" cy="30" r="21" fill="#f59e0b" />
      <circle cx="32" cy="30" r="18" fill="#fef3c7" />
      {/* Target */}
      <circle cx="32" cy="30" r="14" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <circle cx="32" cy="30" r="8" stroke="#d97706" strokeWidth="2.5" fill="none" />
      <circle cx="32" cy="30" r="3" fill="#d97706" />
    </B>
  )
}

/* ── 4. Week Warrior — flame on shield ── */
function WeekWarrior(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={shield} fill="#dc2626" />
      <path d={shield} fill="#000" opacity="0.1" />
      <path d="M32 3L7 16v18c0 15 11 23 25 27" fill="#ef4444" />
      {/* Flame */}
      <path d="M32 14c-5 7-12 12-12 22a12 12 0 0024 0c0-10-7-15-12-22z" fill="#fef2f2" opacity="0.25" />
      <path d="M32 22c-3 5-7 8-7 14a7 7 0 0014 0c0-6-4-9-7-14z" fill="#fef2f2" opacity="0.55" />
      <path d="M32 30c-1.5 3-4 5-4 8a4 4 0 008 0c0-3-2.5-5-4-8z" fill="#fff" opacity="0.9" />
    </B>
  )
}

/* ── 5. Century Club — laurel wreath, medal ── */
function CenturyClub(p: BadgeProps) {
  return (
    <B {...p}>
      <path d="M20 50l-5 11 7-3 2 5 4-9" fill="#047857" opacity="0.5" />
      <path d="M44 50l5 11-7-3-2 5-4-9" fill="#047857" opacity="0.5" />
      <circle cx="32" cy="30" r="24" fill="#059669" />
      <circle cx="32" cy="30" r="21" fill="#10b981" />
      <circle cx="32" cy="30" r="18" fill="#d1fae5" />
      {/* Wreath — left branch */}
      <path d="M18 40c1-5 3-10 7-15" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="19" cy="35" rx="3" ry="1.5" transform="rotate(-30 19 35)" fill="#059669" opacity="0.6" />
      <ellipse cx="21" cy="30" rx="3" ry="1.5" transform="rotate(-20 21 30)" fill="#059669" opacity="0.6" />
      {/* Wreath — right branch */}
      <path d="M46 40c-1-5-3-10-7-15" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="45" cy="35" rx="3" ry="1.5" transform="rotate(30 45 35)" fill="#059669" opacity="0.6" />
      <ellipse cx="43" cy="30" rx="3" ry="1.5" transform="rotate(20 43 30)" fill="#059669" opacity="0.6" />
      {/* Star */}
      <path d="M32 20l3 6 6 1-4.5 4 1 6.5-5.5-3-5.5 3 1-6.5L23 27l6-1 3-6z" fill="#059669" />
    </B>
  )
}

/* ── 6. Speed Reader — bolt, hexagon ── */
function SpeedReader(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={hex} fill="#c2410c" />
      <path d={hex} fill="#000" opacity="0.08" />
      <path d="M32 3L57 18v28L32 61" fill="#ea580c" />
      {/* Lightning */}
      <path d="M36 10L20 34h12L28 54 46 28H34l6-18z" fill="#fff" opacity="0.92" />
    </B>
  )
}

/* ── 7. Quiz Champion — trophy, shield ── */
function QuizChampion(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={shield} fill="#7e22ce" />
      <path d={shield} fill="#000" opacity="0.1" />
      <path d="M32 3L7 16v18c0 15 11 23 25 27" fill="#9333ea" />
      {/* Cup */}
      <path d="M21 16h22v12c0 7-5 12-11 12s-11-5-11-12V16z" fill="#fff" opacity="0.85" />
      {/* Handles */}
      <path d="M21 20c-3 0-6 2-6 5s3 5 6 5" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M43 20c3 0 6 2 6 5s-3 5-6 5" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Base */}
      <path d="M30 40v4h-4v2h12v-2h-4v-4" fill="#fff" opacity="0.85" />
      {/* Star on cup */}
      <path d="M32 21l2 4 4.5.5-3.2 3 .8 4.5-4.1-2.2-4.1 2.2.8-4.5-3.2-3L30 25l2-4z" fill="#c084fc" />
    </B>
  )
}

/* ── 8. Dedicated — heart, medal ── */
function Dedicated(p: BadgeProps) {
  return (
    <B {...p}>
      <path d="M20 50l-5 11 7-3 2 5 4-9" fill="#9d174d" opacity="0.5" />
      <path d="M44 50l5 11-7-3-2 5-4-9" fill="#9d174d" opacity="0.5" />
      <circle cx="32" cy="30" r="24" fill="#be185d" />
      <circle cx="32" cy="30" r="21" fill="#ec4899" />
      <circle cx="32" cy="30" r="18" fill="#fce7f3" />
      {/* Heart */}
      <path d="M32 42c-8-6-14-11-14-17a7.5 7.5 0 0114.5-2.5h-1A7.5 7.5 0 0146 25c0 6-6 11-14 17z" fill="#db2777" />
      {/* Inner shine */}
      <path d="M26 24a4 4 0 016 0" stroke="#fce7f3" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </B>
  )
}

/* ── 9. Vocab Builder — rising bars, hexagon ── */
function VocabBuilder(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={hex} fill="#0f766e" />
      <path d={hex} fill="#000" opacity="0.08" />
      <path d="M32 3L57 18v28L32 61" fill="#14b8a6" />
      {/* Bars */}
      <rect x="14" y="38" width="8" height="10" rx="2" fill="#fff" opacity="0.45" />
      <rect x="24" y="30" width="8" height="18" rx="2" fill="#fff" opacity="0.65" />
      <rect x="34" y="22" width="8" height="26" rx="2" fill="#fff" opacity="0.8" />
      <rect x="44" y="14" width="8" height="34" rx="2" fill="#fff" opacity="0.95" />
    </B>
  )
}

/* ── 10. Rising Star — rocket, shield ── */
function Comeback(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={shield} fill="#4338ca" />
      <path d={shield} fill="#000" opacity="0.1" />
      <path d="M32 3L7 16v18c0 15 11 23 25 27" fill="#6366f1" />
      {/* Rocket */}
      <path d="M32 10c-4 6-6 14-6 22h12c0-8-2-16-6-22z" fill="#fff" opacity="0.9" />
      <path d="M26 32l-5 9h5" fill="#e0e7ff" opacity="0.7" />
      <path d="M38 32l5 9h-5" fill="#e0e7ff" opacity="0.7" />
      <circle cx="32" cy="22" r="3.5" fill="#6366f1" />
      <circle cx="32" cy="22" r="1.8" fill="#a5b4fc" />
      {/* Exhaust */}
      <path d="M29 40q3 8 3 8t3-8" fill="#fbbf24" opacity="0.9" />
    </B>
  )
}

/* ── 11. Explorer — compass, medal ── */
function Explorer(p: BadgeProps) {
  return (
    <B {...p}>
      <path d="M20 50l-5 11 7-3 2 5 4-9" fill="#075985" opacity="0.5" />
      <path d="M44 50l5 11-7-3-2 5-4-9" fill="#075985" opacity="0.5" />
      <circle cx="32" cy="30" r="24" fill="#0369a1" />
      <circle cx="32" cy="30" r="21" fill="#0ea5e9" />
      <circle cx="32" cy="30" r="18" fill="#e0f2fe" />
      {/* Compass ring */}
      <circle cx="32" cy="30" r="14" stroke="#0284c7" strokeWidth="2" fill="none" />
      {/* Ticks */}
      <path d="M32 16v4M32 40v4M18 30h4M42 30h4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
      {/* Diamond needle */}
      <path d="M32 18l4 12-4 2-4-2z" fill="#dc2626" />
      <path d="M32 42l4-12-4-2-4 2z" fill="#0284c7" opacity="0.5" />
      <circle cx="32" cy="30" r="2.5" fill="#0369a1" />
      <circle cx="32" cy="30" r="1" fill="#e0f2fe" />
    </B>
  )
}

/* ── 12. Perfectionist — crown, shield ── */
function Perfectionist(p: BadgeProps) {
  return (
    <B {...p}>
      <path d={shield} fill="#a16207" />
      <path d={shield} fill="#000" opacity="0.1" />
      <path d="M32 3L7 16v18c0 15 11 23 25 27" fill="#ca8a04" />
      {/* Crown */}
      <path d="M14 38V22l9 7 9-11 9 11 9-7v16H14z" fill="#fef9c3" opacity="0.9" />
      <path d="M14 38h36" stroke="#fef9c3" strokeWidth="2.5" />
      {/* Gems */}
      <circle cx="23" cy="32" r="2.5" fill="#ca8a04" />
      <circle cx="32" cy="28" r="3" fill="#dc2626" />
      <circle cx="41" cy="32" r="2.5" fill="#ca8a04" />
      {/* Crown tip dots */}
      <circle cx="14" cy="22" r="2" fill="#fef9c3" />
      <circle cx="23" cy="15" r="2" fill="#fef9c3" />
      <circle cx="32" cy="11" r="2" fill="#fef9c3" />
      <circle cx="41" cy="15" r="2" fill="#fef9c3" />
      <circle cx="50" cy="22" r="2" fill="#fef9c3" />
    </B>
  )
}

/* ── Registry ── */

const BADGES: Record<AchievementId, (p: BadgeProps) => React.ReactElement> = {
  first_words: FirstWords,
  bookworm: Bookworm,
  perfect_round: PerfectRound,
  week_warrior: WeekWarrior,
  century_club: CenturyClub,
  speed_reader: SpeedReader,
  quiz_champion: QuizChampion,
  dedicated: Dedicated,
  vocab_builder: VocabBuilder,
  comeback: Comeback,
  explorer: Explorer,
  perfectionist: Perfectionist,
}

export default function AchievementBadge({ id, size = 48, locked = false, className }: {
  id: AchievementId; size?: number; locked?: boolean; className?: string
}) {
  const C = BADGES[id]
  return C ? <C size={size} locked={locked} className={className} /> : null
}
