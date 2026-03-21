import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense } from 'react'
import StreakBanner from '../components/StreakBanner'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'

const DifficultWords = lazy(() => import('./DifficultWords'))

function Fallback() {
  return <div className="shimmer h-6 w-32 rounded-[var(--t-r-btn)] mx-auto my-8" />
}

export default function Practice() {
  const location = useLocation()
  const { t } = useTranslation()
  const { words } = useDifficultWordsStore()
  const isRoot = location.pathname === '/practice'
  const isWords = location.pathname === '/words' || isRoot

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading gradient-text inline-block">{t('practice.title')}</h1>
        <p className="text-th-muted text-sm mt-1 font-ui">{t('practice.subtitle')}</p>
      </div>

      <StreakBanner />

      {/* Tab bar: My Words / Flashcards / Quiz */}
      <div className="flex gap-1.5 card rounded-[var(--t-r-btn)] p-1">
        <NavLink
          to="/practice"
          end
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
              isActive
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="hidden sm:inline">{t('nav.myWords')}</span>
          <span className="sm:hidden">{t('nav.words')}</span>
          {words.length > 0 && (
            <span className="text-[10px] opacity-60">{words.length}</span>
          )}
        </NavLink>
        <NavLink
          to="/practice/flashcards"
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
              isActive
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="2" y="5" width="14" height="16" rx="2" />
            <path d="M8 2h10a2 2 0 012 2v13" />
          </svg>
          {t('nav.flashcards')}
        </NavLink>
        <NavLink
          to="/practice/quiz"
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
              isActive
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          {t('nav.quiz')}
        </NavLink>
      </div>

      {/* "From your saved words" indicator on flashcards/quiz */}
      {!isWords && words.length > 0 && (
        <p className="text-center text-[11px] text-th-accent font-ui flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          {t('practice.fromSavedWords')} ({words.length})
        </p>
      )}

      {isRoot ? (
        <Suspense fallback={<Fallback />}>
          <DifficultWords />
        </Suspense>
      ) : (
        <Outlet />
      )}
    </div>
  )
}
