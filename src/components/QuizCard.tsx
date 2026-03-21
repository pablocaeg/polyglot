import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface QuizCardProps {
  question: string
  options: string[]
  correctIndex: number
  onAnswer: (correct: boolean) => void
}

export default function QuizCard({ question, options, correctIndex, onAnswer }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const { t } = useTranslation()

  const isCorrect = selected !== null && selected === correctIndex

  function handleSelect(index: number) {
    if (selected !== null) return
    setSelected(index)

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(index === correctIndex ? [10] : [30, 50, 30])
    }

    setTimeout(() => onAnswer(index === correctIndex), 700)
  }

  return (
    <div className="w-full max-w-md mx-auto animate-scale-in">
      {/* Question card */}
      <div className={`card rounded-[var(--t-r-card)] p-6 sm:p-8 mb-5 text-center relative overflow-hidden transition-all duration-300 ${
        selected !== null ? (isCorrect ? 'ring-2 ring-th-success/40' : 'ring-2 ring-th-danger/30') : ''
      }`}>
        <p className="text-[11px] font-medium text-th-muted uppercase tracking-widest mb-3 font-ui">
          {t('quiz.translateThisWord')}
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-th-primary font-heading">{question}</p>

        {/* Success burst */}
        {isCorrect && <span className="burst-ring" />}
      </div>

      {/* Options */}
      <div className="space-y-2.5 stagger">
        {options.map((option, i) => {
          let style = 'btn-surface text-th-primary hover:bg-th-surface-hover active:scale-[0.98]'
          let anim = ''
          let icon = null

          if (selected !== null) {
            if (i === correctIndex) {
              style = 'bg-th-success/15 border border-th-success/40 text-th-success ring-1 ring-th-success/30'
              anim = 'animate-pop'
              icon = (
                <svg className="w-5 h-5 text-th-success draw-check" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )
            } else if (i === selected) {
              style = 'bg-th-danger/15 border border-th-danger/40 text-th-danger ring-1 ring-th-danger/30'
              anim = 'animate-shake'
              icon = (
                <svg className="w-5 h-5 text-th-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )
            } else {
              style = 'card opacity-30 text-th-muted scale-[0.98]'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`w-full flex items-center justify-between p-4 min-h-[52px] rounded-[var(--t-r-btn)] text-left font-medium font-body transition-all duration-200 ${style} ${anim}`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold font-ui shrink-0 transition-colors ${
                  selected === null
                    ? 'bg-th-surface-hover text-th-secondary'
                    : i === correctIndex
                      ? 'bg-th-success/20 text-th-success'
                      : i === selected
                        ? 'bg-th-danger/20 text-th-danger'
                        : 'bg-th-surface-hover text-th-muted'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
              </span>
              {icon}
            </button>
          )
        })}
      </div>
    </div>
  )
}
