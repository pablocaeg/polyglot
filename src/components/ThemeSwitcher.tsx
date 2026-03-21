import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore, THEMES, type ThemeId } from '../stores/useThemeStore'
import { Palette } from './Icons'

export function ThemeSwitcherInline() {
  const { theme, setTheme } = useThemeStore()
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-th-muted">{t('theme.title')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {THEMES.map((th) => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            className={`group relative p-2 transition-all duration-200 rounded-[var(--t-r-btn)] ${
              theme === th.id
                ? 'ring-2 ring-th-accent'
                : 'hover:bg-th-surface-hover'
            }`}
            title={t(`theme.${th.id}`)}
          >
            {/* Mini preview */}
            <div
              className="w-full aspect-[4/3] rounded-sm overflow-hidden border border-th-border mb-1.5"
              style={{ background: th.colors[0] }}
            >
              <div className="p-1.5 space-y-1">
                <div className="h-1 w-3/4 rounded-full" style={{ background: th.colors[2], opacity: 0.6 }} />
                <div className="h-1 w-1/2 rounded-full" style={{ background: th.colors[1] }} />
                <div className="h-1 w-2/3 rounded-full" style={{ background: th.colors[2], opacity: 0.3 }} />
              </div>
            </div>
            <p className="text-[10px] font-medium text-th-secondary text-center leading-tight">
              {t(`theme.${th.id}`)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ThemeSwitcherMobile() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useThemeStore()
  const { t } = useTranslation()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-th-secondary hover:text-th-primary transition-colors"
        aria-label={t('theme.changeTheme')}
      >
        <Palette className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-th-overlay" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg mx-4 mb-4 card rounded-[var(--t-r-popup)] p-5 animate-slide-up">
            {/* Handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-th-muted" />

            <p className="text-sm font-semibold text-th-primary mt-2 mb-4 font-heading">{t('theme.chooseTheme')}</p>

            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((th) => (
                <ThemePreviewCard
                  key={th.id}
                  theme={th}
                  active={theme === th.id}
                  onSelect={(id) => { setTheme(id); setOpen(false) }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ThemePreviewCard({
  theme: th,
  active,
  onSelect,
}: {
  theme: typeof THEMES[number]
  active: boolean
  onSelect: (id: ThemeId) => void
}) {
  const { t } = useTranslation()

  return (
    <button
      onClick={() => onSelect(th.id)}
      className={`p-2.5 rounded-[var(--t-r-card)] transition-all duration-200 text-left ${
        active
          ? 'ring-2 ring-th-accent bg-th-surface'
          : 'hover:bg-th-surface-hover'
      }`}
    >
      {/* Preview swatch */}
      <div
        className="w-full aspect-[5/3] rounded-sm overflow-hidden mb-2"
        style={{ background: th.colors[0], border: `1px solid ${th.colors[2]}20` }}
      >
        <div className="p-2 space-y-1">
          <div className="h-1.5 w-4/5 rounded-full" style={{ background: th.colors[2], opacity: 0.5 }} />
          <div className="h-1.5 w-3/5 rounded-full" style={{ background: th.colors[1] }} />
          <div className="h-1.5 w-2/3 rounded-full" style={{ background: th.colors[2], opacity: 0.2 }} />
        </div>
      </div>
      <p className="text-xs font-semibold text-th-primary">{t(`theme.${th.id}`)}</p>
      <p className="text-[10px] text-th-muted leading-tight">{t(`theme.${th.id}Desc`)}</p>
    </button>
  )
}
