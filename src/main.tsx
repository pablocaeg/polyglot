import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './i18n'
import './index.css'
import Layout from './components/Layout'
import Home from './routes/Home'

// Lazy-load all routes except Home (first paint)
const TextReader = lazy(() => import('./routes/TextReader'))
const DifficultWords = lazy(() => import('./routes/DifficultWords'))
const Practice = lazy(() => import('./routes/Practice'))
const Flashcards = lazy(() => import('./routes/Flashcards'))
const Quiz = lazy(() => import('./routes/Quiz'))
const Stats = lazy(() => import('./routes/Stats'))
const Settings = lazy(() => import('./routes/Settings'))

function Fallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="shimmer h-6 w-32 rounded-[var(--t-r-btn)]" />
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<Fallback />}>
      <Component />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/text/:id', element: withSuspense(TextReader) },
      { path: '/words', element: withSuspense(DifficultWords) },
      {
        path: '/practice',
        element: withSuspense(Practice),
        children: [
          { path: 'flashcards', element: withSuspense(Flashcards) },
          { path: 'quiz', element: withSuspense(Quiz) },
        ],
      },
      { path: '/stats', element: withSuspense(Stats) },
      { path: '/settings', element: withSuspense(Settings) },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
