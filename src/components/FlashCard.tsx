import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface FlashCardProps {
  front: string
  back: string
  context?: string
  totalCards?: number
  onGotIt: () => void
  onStillLearning: () => void
}

export default function FlashCard({ front, back, context, totalCards, onGotIt, onStillLearning }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const { t } = useTranslation()
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Keyboard support
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && e.key === 'ArrowRight') {
        onGotIt()
      } else if (flipped && e.key === 'ArrowLeft') {
        onStillLearning()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [flipped, onGotIt, onStillLearning])

  // Touch/swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!flipped) return
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [flipped])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !flipped) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y)
    if (dy > 40) return // vertical scroll, ignore
    if (Math.abs(dx) > 10) {
      setSwiping(true)
      setSwipeX(dx)
    }
  }, [flipped])

  const handleTouchEnd = useCallback(() => {
    if (!swiping) {
      touchStart.current = null
      return
    }
    const threshold = 80
    if (swipeX > threshold) {
      if (navigator.vibrate) navigator.vibrate(10)
      onGotIt()
    } else if (swipeX < -threshold) {
      if (navigator.vibrate) navigator.vibrate(10)
      onStillLearning()
    }
    setSwipeX(0)
    setSwiping(false)
    touchStart.current = null
  }, [swiping, swipeX, onGotIt, onStillLearning])

  const swipeRotation = swiping ? swipeX * 0.08 : 0
  const swipeOpacity = swiping ? Math.max(0.4, 1 - Math.abs(swipeX) / 200) : 1

  return (
    <div className="w-full max-w-sm lg:max-w-md mx-auto animate-scale-in" tabIndex={0}>
      {/* Card stack visual (decorative cards behind) */}
      <div className="relative">
        {(totalCards ?? 2) > 1 && (
          <>
            <div className="absolute inset-x-2 top-2 h-full card rounded-[var(--t-r-card)] opacity-30 -z-20" />
            <div className="absolute inset-x-1 top-1 h-full card rounded-[var(--t-r-card)] opacity-50 -z-10" />
          </>
        )}

        {/* Main card */}
        <div
          ref={cardRef}
          className="relative w-full h-64 sm:h-72 lg:h-80 cursor-pointer select-none"
          style={{ perspective: '1200px' }}
          onClick={() => setFlipped(!flipped)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className={`flip-inner ${flipped ? 'flipped' : ''}`}
            style={swiping ? {
              transform: `rotateY(180deg) translateX(${swipeX}px) rotate(${swipeRotation}deg)`,
              opacity: swipeOpacity,
              transition: 'none',
            } : undefined}
          >
            {/* Front — no .card class to avoid backdrop-filter breaking 3D transforms */}
            <div className="flip-face rounded-[var(--t-r-card)] flex flex-col items-center justify-center p-8 relative"
              style={{ background: 'var(--t-surface)', border: 'var(--t-card-border, 1px solid var(--t-border))', boxShadow: 'var(--t-card-shadow, none)' }}
            >
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-th-primary text-center leading-snug font-heading break-words">
                {front}
              </p>
              {context && (
                <p className="mt-4 text-sm text-th-muted text-center italic line-clamp-2 font-body">
                  &ldquo;{context}&rdquo;
                </p>
              )}
              <div className="absolute bottom-4 flex items-center gap-1.5 text-[11px] text-th-muted tracking-wide font-ui">
                <span>{t('flashcards.tapToReveal')}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-[3px] bg-th-surface-hover text-th-muted text-[9px] font-mono border border-th-border">
                  space
                </kbd>
              </div>
            </div>

            {/* Back — no .card class to avoid backdrop-filter breaking 3D transforms */}
            <div className="flip-face flip-back rounded-[var(--t-r-card)] flex flex-col items-center justify-center p-8 relative"
              style={{ background: 'color-mix(in srgb, var(--t-accent) 8%, var(--t-bg))', border: '1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)' }}
            >
              {/* Swipe direction indicators */}
              {swiping && swipeX < -20 && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-th-warning text-xs font-semibold font-ui opacity-60">
                  {t('flashcards.stillLearning')}
                </div>
              )}
              {swiping && swipeX > 20 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-th-success text-xs font-semibold font-ui opacity-60">
                  {t('flashcards.gotIt')}
                </div>
              )}

              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-th-accent text-center leading-snug font-heading break-words">
                {back}
              </p>
              <div className="mt-3 h-px w-12 bg-th-accent/30" />
              <p className="mt-3 text-base text-th-secondary text-center font-body">{front}</p>

              <div className="absolute bottom-4 hidden sm:flex items-center gap-3 text-[9px] text-th-muted font-mono">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-[3px] bg-th-surface-hover border border-th-border">&larr;</kbd>
                  {t('flashcards.stillLearning')}
                </span>
                <span className="flex items-center gap-1">
                  {t('flashcards.gotIt')}
                  <kbd className="px-1.5 py-0.5 rounded-[3px] bg-th-surface-hover border border-th-border">&rarr;</kbd>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className={`flex gap-3 mt-5 transition-all duration-300 ${flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onStillLearning() }}
          className="flex-1 py-3.5 rounded-[var(--t-r-btn)] btn-surface text-th-secondary font-semibold text-sm font-ui hover:bg-th-surface-hover active:scale-[0.97] transition-all min-h-[48px]"
        >
          {t('flashcards.stillLearning')}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onGotIt() }}
          className="flex-1 py-3.5 rounded-[var(--t-r-btn)] bg-th-success text-th-on-accent font-semibold text-sm font-ui hover:brightness-110 active:scale-[0.97] transition-all min-h-[48px]"
        >
          {t('flashcards.gotIt')}
        </button>
      </div>
    </div>
  )
}
