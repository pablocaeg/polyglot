import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDifficultWordsStore } from '../stores/useDifficultWordsStore'
import { useActivityStore } from '../stores/useActivityStore'
import QuizCard from '../components/QuizCard'
import { useGamificationStore } from '../stores/useGamificationStore'
import { Puzzle, Trophy, Sparkle, Dumbbell } from '../components/Icons'

interface QuizQuestion {
  wordId: string
  question: string
  options: string[]
  correctIndex: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestions(
  words: { id: string; word: string; translation: string }[]
): QuizQuestion[] {
  // Filter out words with empty/blank word or translation
  const validWords = words.filter(
    (w) => w.word.trim() && w.translation.trim()
  )

  // Need at least 4 unique translations to build a quiz
  const uniqueTranslations = new Set(validWords.map((w) => w.translation.trim().toLowerCase()))
  if (uniqueTranslations.size < 4) return []

  const shuffled = shuffle(validWords).slice(0, 10)
  return shuffled.flatMap((w) => {
    const correctAnswer = w.translation.trim()
    // Pick 3 wrong options with unique translations different from the correct answer
    const seen = new Set([correctAnswer.toLowerCase()])
    const wrongOptions: string[] = []

    for (const o of shuffle(validWords)) {
      if (wrongOptions.length >= 3) break
      const candidate = o.translation.trim()
      if (!candidate) continue
      const key = candidate.toLowerCase()
      if (o.word === w.word || seen.has(key)) continue
      seen.add(key)
      wrongOptions.push(candidate)
    }

    // Skip this question if we couldn't find 3 distinct wrong options
    if (wrongOptions.length < 3) return []

    const options = shuffle([correctAnswer, ...wrongOptions])
    return [{
      wordId: w.id,
      question: w.word,
      options,
      correctIndex: options.indexOf(correctAnswer),
    }]
  })
}

export default function Quiz() {
  const { words, loadWords, recordReview } = useDifficultWordsStore()
  const { recordReview: recordActivityReview, recordQuizResult } = useActivityStore()
  const { awardXP, recordQuizComplete, recordPerfectQuiz, checkAchievements } = useGamificationStore()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState<{ word: string; correct: boolean }[]>([])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  const unlearnedWords = useMemo(() => words.filter((w) => !w.learned), [words])
  const questions = useMemo(
    () => (started ? generateQuestions(unlearnedWords) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [started]
  )

  async function handleAnswer(correct: boolean) {
    if (correct) setScore((s) => s + 1)

    // Record SRS review, track answer, and award XP
    const q = questions[currentIndex]
    if (q) {
      await recordReview(q.wordId, 'quiz', correct)
      await recordActivityReview()
      awardXP(correct ? 'quizCorrect' : 'quizWrong')
      setAnswers((prev) => [...prev, { word: q.question, correct }])
    }

    if (currentIndex + 1 >= questions.length) {
      const finalScore = correct ? score + 1 : score
      await recordQuizResult(finalScore, questions.length)
      recordQuizComplete()
      if (finalScore === questions.length) {
        recordPerfectQuiz()
        awardXP('perfectQuiz')
      }
      // Check achievements after quiz
      checkAchievements({
        totalWordsSaved: words.length,
        masteredWords: words.filter((w) => w.mastery === 'mastered').length,
      })
      setTimeout(() => setFinished(true), 900)
    } else {
      setTimeout(() => setCurrentIndex((i) => i + 1), 900)
    }
  }

  function restart() {
    setCurrentIndex(0)
    setScore(0)
    setFinished(false)
    setStarted(false)
    setAnswers([])
  }

  const validUnlearned = unlearnedWords.filter((w) => w.word.trim() && w.translation.trim())
  const uniqueTranslationCount = new Set(validUnlearned.map((w) => w.translation.trim().toLowerCase())).size
  if (uniqueTranslationCount < 4) {
    return (
      <div className="text-center py-12 animate-fade-in space-y-4">
        <Puzzle className="w-12 h-12 mx-auto text-th-muted mb-1" />
        <div>
          <p className="text-th-secondary font-ui">{t('quiz.needAtLeast4Words')}</p>
          <p className="text-th-muted text-sm mt-1 font-ui">
            {unlearnedWords.length > 0
              ? t('quiz.needUniqueTranslations', { count: unlearnedWords.length })
              : t('quiz.markMoreWords')}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent text-sm font-semibold font-ui hover:bg-th-accent-hover active:scale-[0.98] transition-all"
        >
          {t('quiz.readAndMark')}
        </button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="text-center py-12 space-y-5 animate-fade-in">
        <Trophy className="w-14 h-14 mx-auto text-th-accent" />
        <div>
          <p className="text-xl font-bold text-th-primary font-heading">{t('quiz.readyToTest')}</p>
          <p className="text-th-secondary text-sm mt-1 font-ui">{t('quiz.wordsAvailable', { count: unlearnedWords.length })}</p>
        </div>
        <button
          onClick={() => setStarted(true)}
          className="px-10 py-3.5 bg-th-accent rounded-[var(--t-r-btn)] text-th-on-accent font-semibold font-ui hover:bg-th-accent-hover active:scale-[0.98] transition-all"
        >
          {t('quiz.startQuiz')}
        </button>
      </div>
    )
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100)
    const ResultIcon = percent >= 80 ? Sparkle : Dumbbell
    const wrongAnswers = answers.filter((a) => !a.correct)
    return (
      <div className="py-8 space-y-6 animate-scale-in">
        <div className="text-center space-y-3">
          <ResultIcon className="w-14 h-14 mx-auto text-th-accent" />
          <p className="text-5xl font-black font-heading gradient-text inline-block">{percent}%</p>
          <p className="text-th-secondary font-ui">
            {t('quiz.correct', { score, total: questions.length })}
          </p>
          <p className="text-th-muted text-sm font-ui">
            {percent >= 80
              ? t('quiz.excellentWork')
              : percent >= 50
                ? t('quiz.keepPracticing')
                : t('quiz.youllGetThere')}
          </p>
        </div>

        {/* Answer breakdown */}
        {answers.length > 0 && (
          <div className="card rounded-[var(--t-r-card)] p-4 space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-ui">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  a.correct ? 'bg-th-success/15 text-th-success' : 'bg-th-danger/15 text-th-danger'
                }`}>
                  {a.correct ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
                <span className={a.correct ? 'text-th-secondary' : 'text-th-primary font-medium'}>{a.word}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {wrongAnswers.length > 0 && (
            <button
              onClick={() => navigate('/practice/flashcards')}
              className="flex-1 py-3 rounded-[var(--t-r-btn)] bg-th-accent text-th-on-accent font-semibold text-sm font-ui hover:bg-th-accent-hover active:scale-[0.98] transition-all"
            >
              {t('quiz.reviewWeakWords')}
            </button>
          )}
          <button
            onClick={restart}
            className="flex-1 py-3 btn-surface rounded-[var(--t-r-btn)] text-th-primary font-semibold text-sm font-ui hover:bg-th-surface-hover active:scale-[0.98] transition-all"
          >
            {t('quiz.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-th-secondary font-medium tabular-nums font-ui">
          {currentIndex + 1} <span className="text-th-muted">/</span> {questions.length}
        </p>
        <div className="w-full h-2 rounded-full bg-th-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-th-accent transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <QuizCard
        key={currentIndex}
        question={questions[currentIndex].question}
        options={questions[currentIndex].options}
        correctIndex={questions[currentIndex].correctIndex}
        onAnswer={handleAnswer}
      />
    </div>
  )
}
