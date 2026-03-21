import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../stores/useSettingsStore'
import { FlagPL, FlagES, FlagEN, FlagFR, FlagDE, FlagIT, FlagPT, FlagNL } from './Icons'
import type { Language } from '../types'

const FLAGS: Record<Language, typeof FlagPL> = {
  pl: FlagPL, es: FlagES, en: FlagEN,
  fr: FlagFR, de: FlagDE, it: FlagIT, pt: FlagPT, nl: FlagNL,
}

const ALL_LANGUAGES: Language[] = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'pt']

type PickerSide = 'native' | 'target' | null

export default function LanguagePairSelector() {
  const { direction, setNativeLanguage, setTargetLanguage, swapLanguages } = useSettingsStore()
  const { t } = useTranslation()
  const [openSide, setOpenSide] = useState<PickerSide>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenSide(null)
      }
    }
    if (openSide) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [openSide])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenSide(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function handleSelect(lang: Language) {
    if (openSide === 'native') setNativeLanguage(lang)
    else if (openSide === 'target') setTargetLanguage(lang)
    setOpenSide(null)
  }

  const NativeFlag = FLAGS[direction.native]
  const TargetFlag = FLAGS[direction.target]
  const excludedLang = openSide === 'native' ? direction.target : direction.native
  const availableLanguages = ALL_LANGUAGES.filter((l) => l !== excludedLang)

  return (
    <div className="card rounded-[var(--t-r-card)] p-5" ref={containerRef}>
      <div className="flex items-center justify-center gap-6 sm:gap-8">
        {/* Native */}
        <button
          onClick={() => setOpenSide(openSide === 'native' ? null : 'native')}
          className="flex flex-col items-center gap-2 group"
        >
          <div className={`rounded-[var(--t-r-btn)] p-1.5 transition-all duration-200 ${
            openSide === 'native'
              ? 'ring-2 ring-th-accent shadow-lg shadow-th-accent/10 scale-105'
              : 'group-hover:scale-105'
          }`}>
            <NativeFlag className="w-12 h-9 sm:w-14 sm:h-10" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-th-primary font-heading leading-tight">
              {t(`languages.${direction.native}`)}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-widest text-th-accent font-ui mt-0.5">
              {t('languages.iSpeak')}
            </p>
          </div>
        </button>

        {/* Swap */}
        <button
          onClick={() => { swapLanguages(); setOpenSide(null) }}
          className="group w-9 h-9 rounded-full bg-th-accent/8 hover:bg-th-accent/15 border border-th-accent/15 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 -mt-3"
          aria-label={t('languages.swapLanguages')}
        >
          <svg
            className="w-4 h-4 text-th-accent transition-transform duration-300 group-hover:rotate-180"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </button>

        {/* Target */}
        <button
          onClick={() => setOpenSide(openSide === 'target' ? null : 'target')}
          className="flex flex-col items-center gap-2 group"
        >
          <div className={`rounded-[var(--t-r-btn)] p-1.5 transition-all duration-200 ${
            openSide === 'target'
              ? 'ring-2 ring-th-warning shadow-lg shadow-th-warning/10 scale-105'
              : 'group-hover:scale-105'
          }`}>
            <TargetFlag className="w-12 h-9 sm:w-14 sm:h-10" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-th-primary font-heading leading-tight">
              {t(`languages.${direction.target}`)}
            </p>
            <p className="text-[9px] font-medium uppercase tracking-widest text-th-warning font-ui mt-0.5">
              {t('languages.iLearn')}
            </p>
          </div>
        </button>
      </div>

      {/* Language grid */}
      {openSide && (
        <div className="mt-4 pt-4 border-t border-th-border animate-fade-in">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {availableLanguages.map((lang) => {
              const Flag = FLAGS[lang]
              const isSelected = openSide === 'native'
                ? direction.native === lang
                : direction.target === lang

              return (
                <button
                  key={lang}
                  onClick={() => handleSelect(lang)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-[var(--t-r-btn)] transition-all duration-150 ${
                    isSelected
                      ? 'bg-th-accent/15 ring-1 ring-th-accent/30'
                      : 'hover:bg-th-surface-hover active:scale-95'
                  }`}
                >
                  <Flag className="w-9 h-7" />
                  <span className={`text-[10px] font-medium font-ui ${
                    isSelected ? 'text-th-accent' : 'text-th-secondary'
                  }`}>
                    {t(`languages.${lang}`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
