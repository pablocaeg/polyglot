import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StreakBanner from '../components/StreakBanner'

export default function Practice() {
  const location = useLocation()
  const { t } = useTranslation()
  const isRoot = location.pathname === '/practice'

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading gradient-text inline-block">{t('practice.title')}</h1>
        <p className="text-th-muted text-sm mt-1 font-ui">{t('practice.subtitle')}</p>
      </div>

      <StreakBanner />

      <div className="flex gap-2">
        <NavLink
          to="/practice/flashcards"
          className={({ isActive }) =>
            `flex-1 flex items-center justify-center gap-2 py-3 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
              isActive
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'btn-surface text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
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
            `flex-1 flex items-center justify-center gap-2 py-3 rounded-[var(--t-r-btn)] text-sm font-semibold font-ui transition-all duration-200 ${
              isActive
                ? 'bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25'
                : 'btn-surface text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
            }`
          }
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          {t('nav.quiz')}
        </NavLink>
      </div>

      {isRoot ? (
        <div className="text-center py-12 animate-fade-in space-y-3">
          <p className="text-th-secondary text-sm font-ui">{t('practice.choosePracticeMode')}</p>
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  )
}
