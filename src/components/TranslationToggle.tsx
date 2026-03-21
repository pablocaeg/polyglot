import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TranslationToggleProps {
  translation: string
}

export default function TranslationToggle({ translation }: TranslationToggleProps) {
  const [show, setShow] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="mt-6">
      <button
        onClick={() => setShow(!show)}
        className="group flex items-center gap-2 text-sm font-medium text-th-muted hover:text-th-accent transition-colors font-ui"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${show ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {show ? t('textReader.hideTranslation') : t('textReader.showTranslation')}
      </button>
      {show && (
        <div className="mt-3 card rounded-[var(--t-r-card)] p-4 animate-fade-in">
          <p className="text-th-secondary text-base leading-relaxed font-body">{translation}</p>
        </div>
      )}
    </div>
  )
}
