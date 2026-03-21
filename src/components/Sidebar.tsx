import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeSwitcherInline } from './ThemeSwitcher'
import UILanguageSwitcher from './UILanguageSwitcher'
import XPBar from './XPBar'
import { useActivityStore } from '../stores/useActivityStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useEffect } from 'react'

const links = [
  {
    to: '/',
    labelKey: 'nav.home',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    to: '/words',
    labelKey: 'nav.difficultWords',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    to: '/practice/flashcards',
    labelKey: 'nav.flashcards',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="5" width="14" height="16" rx="2" />
        <path d="M8 2h10a2 2 0 012 2v13" />
      </svg>
    ),
  },
  {
    to: '/practice/quiz',
    labelKey: 'nav.quiz',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    to: '/stats',
    labelKey: 'nav.stats',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    labelKey: 'nav.settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

function SidebarProgress() {
  const { today, streak, loaded, loadActivity } = useActivityStore()
  const { dailyGoal } = useSettingsStore()
  const { words, loadWords, getWordsDue } = useDifficultWordsStore()
  const { t } = useTranslation()

  useEffect(() => {
    if (!loaded) loadActivity()
    loadWords()
  }, [loaded, loadActivity, loadWords])

  if (!loaded) return null

  const progress = Math.min(today.reviewCount / dailyGoal, 1)
  const dueCount = words.length > 0 ? getWordsDue().length : 0

  return (
    <div className="px-4 py-4 border-t border-th-border space-y-3">
      {/* Daily ring */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" className="stroke-th-surface-hover" />
            <circle
              cx="20" cy="20" r="16" fill="none" strokeWidth="3"
              className="stroke-th-accent"
              strokeLinecap="round"
              strokeDasharray={`${progress * 100.5} 100.5`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-th-primary font-heading tabular-nums">
            {today.reviewCount}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-th-primary font-ui">
            {streak > 0 ? t('streak.dayStreak', { count: streak }) : t('streak.startStreak')}
          </p>
          <p className="text-[10px] text-th-muted font-ui">
            {t('streak.reviewsToday', { progress: today.reviewCount, goal: dailyGoal })}
          </p>
        </div>
      </div>

      {/* Due words */}
      {dueCount > 0 && (
        <NavLink
          to="/practice/flashcards"
          className="flex items-center gap-2 px-3 py-2 rounded-[var(--t-r-btn)] bg-th-accent/10 text-th-accent text-xs font-medium font-ui hover:bg-th-accent/15 transition-all"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('sidebar.wordsDue', { count: dueCount })}
        </NavLink>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col z-40">
      <div className="flex flex-col h-full card border-r border-th-border !rounded-none">
        {/* Top spacer */}
        <div className="pt-6" />

        {/* Navigation — min-h-[44px] ensures touch/click targets */}
        <nav className="flex-1 px-3 space-y-0.5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-[44px] rounded-[var(--t-r-btn)] text-sm font-medium font-ui transition-all duration-200 ${
                  isActive
                    ? 'bg-th-accent/15 text-th-accent'
                    : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
                }`
              }
            >
              {link.icon}
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Progress widget */}
        <SidebarProgress />

        {/* XP progress */}
        <div className="px-4 py-3 border-t border-th-border">
          <XPBar compact />
        </div>

        {/* Language & Theme switcher */}
        <div className="px-4 py-4 border-t border-th-border space-y-4">
          <UILanguageSwitcher />
          <ThemeSwitcherInline />
        </div>
      </div>
    </aside>
  )
}
