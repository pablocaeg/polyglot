import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useActivityStore } from '../stores/useActivityStore'
import FlashCard from '../components/FlashCard'
import MasteryBadge from '../components/MasteryBadge'
import { Cards, Target } from '../components/Icons'
import { useGamificationStore } from '../stores/useGamificationStore'

type Mode = 'due' | 'all'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Flashcards() {
  const { words, loadWords, recordReview, getWordsDue } = useDifficultWordsStore()
  const { recordReview: recordActivityReview } = useActivityStore()
  const { awardXP } = useGamificationStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [mode, setMode] = useState<Mode>('due')

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const validWords = useMemo(
    () => words.filter((w) => w.word.trim() && w.translation.trim()),
    [words]
  )

  const dueWords = useMemo(
    () => getWordsDue().filter((w) => w.word.trim() && w.translation.trim()),
    [words, getWordsDue]
  )

  // In "all" mode, shuffle all valid words
  const allWordsShuffled = useMemo(
    () => shuffle(validWords),
    // Re-shuffle when switching to "all" mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validWords, mode]
  )

  const deck = mode === 'due' ? dueWords : allWordsShuffled
  const currentWord = deck[currentIndex]
  const total = deck.length

  function switchMode(newMode: Mode) {
    setMode(newMode)
    setCurrentIndex(0)
    setReviewedCount(0)
  }

  async function handleGotIt() {
    if (!currentWord) return
    await recordReview(currentWord.id, 'flashcard', true)
    await recordActivityReview()
    awardXP('flashcardCorrect')
    setReviewedCount((c) => c + 1)

    if (mode === 'due') {
      // Due mode: word gets removed from due list, stay at same index or go back
      if (currentIndex >= total - 1) {
        setCurrentIndex(Math.max(0, total - 2))
      }
    } else {
      // All mode: just advance
      setCurrentIndex((i) => (i + 1 >= total ? 0 : i + 1))
    }
  }

  async function handleStillLearning() {
    if (!currentWord) return
    await recordReview(currentWord.id, 'flashcard', false)
    await recordActivityReview()
    awardXP('flashcardWrong')
    setReviewedCount((c) => c + 1)
    setCurrentIndex((i) => (i + 1 >= total ? 0 : i + 1))
  }

  // No words at all
  if (validWords.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in space-y-4">
        <Cards className="w-12 h-12 mx-auto text-th-muted mb-1" />
        <p className="text-th-secondary font-ui">{t('flashcards.noWordsToReview')}</p>
        <p className="text-th-muted text-sm font-ui">{t('flashcards.markWordsDifficult')}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-sm font-semibold font-ui hover:bg-th-accent-hover active:scale-[0.98] transition-all"
        >
          {t('flashcards.readAndMark')}
        </button>
      </div>
    )
  }

  // Due mode finished
  if (mode === 'due' && dueWords.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in space-y-4">
        <Target className="w-12 h-12 mx-auto text-th-success mb-1" />
        <p className="text-th-primary font-semibold font-heading">{t('flashcards.allCaughtUp')}</p>
        {reviewedCount > 0 && (
          <p className="text-th-muted text-sm font-ui">
            {t('flashcards.reviewedCount', { count: reviewedCount })}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => switchMode('all')}
            className="px-6 py-2.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-sm font-semibold font-ui hover:bg-th-accent-hover active:scale-[0.98] transition-all"
          >
            {t('flashcards.reviewAll')}
          </button>
          <button
            onClick={() => navigate('/practice/quiz')}
            className="px-6 py-2.5 rounded-[var(--t-r-btn)] btn-surface text-th-secondary text-sm font-semibold font-ui hover:bg-th-surface-hover active:scale-[0.98] transition-all"
          >
            {t('flashcards.takeAQuiz')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mode toggle + progress */}
      <div className="space-y-3">
        {/* Mode tabs — only show if there are both due and all words */}
        {dueWords.length > 0 && validWords.length > dueWords.length && (
          <div className="flex gap-1 card rounded-[var(--t-r-btn)] p-0.5 w-fit mx-auto">
            <button
              onClick={() => switchMode('due')}
              className={`px-4 py-1.5 rounded-[var(--t-r-btn)] text-xs font-semibold font-ui transition-all ${
                mode === 'due'
                  ? 'bg-th-accent text-th-on-accent'
                  : 'text-th-muted hover:text-th-primary'
              }`}
            >
              {t('flashcards.due')} ({dueWords.length})
            </button>
            <button
              onClick={() => switchMode('all')}
              className={`px-4 py-1.5 rounded-[var(--t-r-btn)] text-xs font-semibold font-ui transition-all ${
                mode === 'all'
                  ? 'bg-th-accent text-th-on-accent'
                  : 'text-th-muted hover:text-th-primary'
              }`}
            >
              {t('flashcards.all')} ({validWords.length})
            </button>
          </div>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-th-secondary font-medium tabular-nums font-ui">
            {currentIndex + 1} <span className="text-th-muted">/</span> {total}
          </p>
          <div className="w-full h-2 rounded-full bg-th-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-th-accent transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {currentWord && (
        <>
          <div className="flex justify-center">
            <MasteryBadge level={currentWord.mastery || 'new'} />
          </div>
          <FlashCard
            key={currentWord.id}
            front={currentWord.word}
            back={currentWord.translation}
            context={currentWord.context}
            totalCards={total}
            onGotIt={handleGotIt}
            onStillLearning={handleStillLearning}
          />
        </>
      )}
    </div>
  )
}
