import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlagEN, FlagPL, FlagES } from './Icons'

const UI_LANGS = [
  { code: 'en', Flag: FlagEN },
  { code: 'pl', Flag: FlagPL },
  { code: 'es', Flag: FlagES },
] as const

function currentLangCode(i18nLang: string): string {
  return UI_LANGS.find((l) => i18nLang?.startsWith(l.code))?.code || 'en'
}

/** Desktop sidebar version — vertical list with flags */
export default function UILanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = currentLangCode(i18n.language)

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-th-muted font-ui">
        {t('uiLanguage.title')}
      </p>
      <div className="space-y-1">
        {UI_LANGS.map(({ code, Flag }) => {
          const active = current === code
          return (
            <button
              key={code}
              onClick={() => i18n.changeLanguage(code)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--t-r-btn)] text-sm font-medium font-ui transition-all duration-200 ${
                active
                  ? 'bg-th-accent/15 text-th-accent'
                  : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
              }`}
            >
              <Flag className="w-7 h-5 shrink-0" />
              <span>{t(`uiLanguage.${code}`)}</span>
              {active && (
                <svg className="w-4 h-4 ml-auto text-th-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Mobile top-bar version — flag button that opens a bottom sheet */
export function UILanguageSwitcherMobile() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = currentLangCode(i18n.language)
  const CurrentFlag = UI_LANGS.find((l) => l.code === current)!.Flag

  function handleSelect(code: string) {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-th-secondary hover:text-th-primary transition-colors"
        aria-label={t('uiLanguage.title')}
      >
        <CurrentFlag className="w-6 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-th-overlay" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg mx-4 mb-4 card rounded-[var(--t-r-popup)] p-5 animate-slide-up">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-th-muted" />

            <p className="text-sm font-semibold text-th-primary mt-2 mb-4 font-heading">
              {t('uiLanguage.title')}
            </p>

            <div className="space-y-1.5">
              {UI_LANGS.map(({ code, Flag }) => {
                const active = current === code
                return (
                  <button
                    key={code}
                    onClick={() => handleSelect(code)}
                    className={`w-full flex items-center gap-3 p-3 rounded-[var(--t-r-btn)] transition-all duration-200 ${
                      active
                        ? 'bg-th-accent/15 ring-1 ring-th-accent/25'
                        : 'hover:bg-th-surface-hover active:scale-[0.98]'
                    }`}
                  >
                    <Flag className="w-8 h-6" />
                    <span className={`text-sm font-medium font-ui ${
                      active ? 'text-th-accent' : 'text-th-primary'
                    }`}>
                      {t(`uiLanguage.${code}`)}
                    </span>
                    {active && (
                      <svg className="w-4 h-4 ml-auto text-th-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
