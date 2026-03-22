import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import i18next from 'i18next'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const t = i18next.t.bind(i18next)
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
          <h1 className="text-2xl font-heading font-bold text-th-primary">
            {t('common.somethingWentWrong')}
          </h1>
          <p className="text-th-secondary max-w-md">
            {t('common.unexpectedError')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent font-medium transition-colors hover:bg-th-accent-hover"
          >
            {t('common.reload')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
