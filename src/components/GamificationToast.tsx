import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGamificationStore } from '../stores/useGamificationStore'
import { ACHIEVEMENTS, getLevelForXP } from '../utils/gamification'
import AchievementBadge from './AchievementBadges'

/* ── Confetti particle ── */

function Particle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full"
      style={{
        left: `${x}%`,
        top: '40%',
        background: color,
        animation: `confetti-fall 1.2s ease-in ${delay}s both`,
      }}
    />
  )
}

const CONFETTI_COLORS = ['var(--t-accent)', 'var(--t-warning)', 'var(--t-success)', 'var(--t-danger)']
const CONFETTI_PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  delay: (i * 0.03) + (i % 3) * 0.1,
  x: 15 + ((i * 4.375) % 70),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

function Confetti() {
  const particles = CONFETTI_PARTICLES

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
      ))}
    </div>
  )
}

/* ── XP toast — small, subtle ── */

function XPToast({ amount, visible }: { amount: number; visible: boolean }) {
  return (
    <div
      className={`fixed top-14 lg:top-4 right-4 z-[70] transition-all duration-300 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      }`}
    >
      <div className="card rounded-[var(--t-r-badge)] px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
        <span className="text-xs font-bold font-heading text-th-accent">+{amount}</span>
        <span className="text-[10px] text-th-muted font-ui">XP</span>
      </div>
    </div>
  )
}

/* ── Achievement celebration — full overlay ── */

function AchievementCelebration({
  achievementId,
  visible,
  onDismiss,
}: {
  achievementId: string
  visible: boolean
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { xp } = useGamificationStore()
  const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId)
  const level = getLevelForXP(xp)

  if (!achievement) return null

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-th-bg/80 backdrop-blur-md" />

      {/* Confetti */}
      {visible && <Confetti />}

      {/* Card */}
      <div
        className="relative flex flex-col items-center px-8 py-10 max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge with glow */}
        <div className={`relative ${visible ? 'badge-entrance' : ''}`}>
          <div className="rounded-full badge-glow">
            <AchievementBadge id={achievement.id} size={96} />
          </div>
          {/* Radial rings */}
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-th-accent/10 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        {/* Text */}
        <div className="mt-6 text-center">
          <p
            className="text-[11px] font-semibold font-ui uppercase tracking-[0.2em] text-th-accent text-reveal"
            style={{ animationDelay: '0.3s' }}
          >
            {t('gamification.achievementUnlocked')}
          </p>
          <h2
            className="text-xl font-bold font-heading text-th-primary mt-2 text-reveal"
            style={{ animationDelay: '0.45s' }}
          >
            {t(achievement.nameKey)}
          </h2>
          <p
            className="text-sm text-th-secondary font-body mt-1 text-reveal"
            style={{ animationDelay: '0.6s' }}
          >
            {t(achievement.descKey)}
          </p>
          <p
            className="text-[10px] text-th-muted font-ui mt-3 text-reveal"
            style={{ animationDelay: '0.75s' }}
          >
            {t('gamification.levelShort', { level: level.level })} · {xp} XP
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="mt-6 px-8 py-2.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-sm font-semibold font-ui hover:brightness-110 active:scale-[0.97] transition-all text-reveal"
          style={{ animationDelay: '0.9s' }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}

/* ── Main controller ── */

export default function GamificationToast() {
  const { pendingToast, dismissToast } = useGamificationStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pendingToast) return

    // Delay to next tick so React batches correctly
    const show = requestAnimationFrame(() => setVisible(true))

    if (pendingToast.type === 'xp') {
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(dismissToast, 300)
      }, 1800)
      return () => { cancelAnimationFrame(show); clearTimeout(timer) }
    }
    // Achievements stay until dismissed manually
    return () => cancelAnimationFrame(show)
  }, [pendingToast, dismissToast])

  if (!pendingToast) return null

  if (pendingToast.type === 'xp') {
    return <XPToast amount={pendingToast.amount} visible={visible} />
  }

  return (
    <AchievementCelebration
      achievementId={pendingToast.id}
      visible={visible}
      onDismiss={() => {
        setVisible(false)
        setTimeout(dismissToast, 300)
      }}
    />
  )
}
