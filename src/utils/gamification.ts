/* ── XP & Levels ─────────────────────────────── */

export const XP_REWARDS = {
  textRead: 20,
  flashcardCorrect: 8,
  flashcardWrong: 3,
  quizCorrect: 10,
  quizWrong: 2,
  wordSaved: 3,
  dailyGoalComplete: 25,
  perfectQuiz: 15,
} as const

export type LevelInfo = {
  level: number
  name: string
  nameKey: string
  xpRequired: number
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Novice',    nameKey: 'gamification.levelNovice',    xpRequired: 0 },
  { level: 2, name: 'Beginner',  nameKey: 'gamification.levelBeginner',  xpRequired: 100 },
  { level: 3, name: 'Explorer',  nameKey: 'gamification.levelExplorer',  xpRequired: 300 },
  { level: 4, name: 'Student',   nameKey: 'gamification.levelStudent',   xpRequired: 600 },
  { level: 5, name: 'Scholar',   nameKey: 'gamification.levelScholar',   xpRequired: 1000 },
  { level: 6, name: 'Expert',    nameKey: 'gamification.levelExpert',    xpRequired: 1800 },
  { level: 7, name: 'Master',    nameKey: 'gamification.levelMaster',    xpRequired: 3000 },
  { level: 8, name: 'Polyglot',  nameKey: 'gamification.levelPolyglot',  xpRequired: 5000 },
]

export function getLevelForXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) return LEVELS[i]
  }
  return LEVELS[0]
}

export function getXPProgress(xp: number): { current: number; needed: number; percent: number } {
  const currentLevel = getLevelForXP(xp)
  const nextLevel = LEVELS.find((l) => l.xpRequired > xp)
  if (!nextLevel) return { current: 0, needed: 0, percent: 100 }
  const current = xp - currentLevel.xpRequired
  const needed = nextLevel.xpRequired - currentLevel.xpRequired
  return { current, needed, percent: Math.round((current / needed) * 100) }
}

/* ── Achievements ────────────────────────────── */

export type AchievementId =
  | 'first_words'
  | 'bookworm'
  | 'perfect_round'
  | 'week_warrior'
  | 'century_club'
  | 'speed_reader'
  | 'quiz_champion'
  | 'dedicated'
  | 'vocab_builder'
  | 'comeback'
  | 'explorer'
  | 'perfectionist'

export type Achievement = {
  id: AchievementId
  nameKey: string
  descKey: string
  icon: AchievementId
  /** Check function receives app stats and returns true if earned */
  check: (stats: AchievementStats) => boolean
}

export type AchievementStats = {
  totalWordsSaved: number
  totalTextsRead: number
  totalQuizzes: number
  perfectQuizzes: number
  currentStreak: number
  longestStreak: number
  masteredWords: number
  textsReadToday: number
  totalXP: number
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_words',
    nameKey: 'achievements.firstWords',
    descKey: 'achievements.firstWordsDesc',
    icon: 'first_words',
    check: (s) => s.totalWordsSaved >= 5,
  },
  {
    id: 'bookworm',
    nameKey: 'achievements.bookworm',
    descKey: 'achievements.bookwormDesc',
    icon: 'bookworm',
    check: (s) => s.totalTextsRead >= 10,
  },
  {
    id: 'perfect_round',
    nameKey: 'achievements.perfectRound',
    descKey: 'achievements.perfectRoundDesc',
    icon: 'perfect_round',
    check: (s) => s.perfectQuizzes >= 1,
  },
  {
    id: 'week_warrior',
    nameKey: 'achievements.weekWarrior',
    descKey: 'achievements.weekWarriorDesc',
    icon: 'week_warrior',
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: 'century_club',
    nameKey: 'achievements.centuryClub',
    descKey: 'achievements.centuryClubDesc',
    icon: 'century_club',
    check: (s) => s.masteredWords >= 100,
  },
  {
    id: 'speed_reader',
    nameKey: 'achievements.speedReader',
    descKey: 'achievements.speedReaderDesc',
    icon: 'speed_reader',
    check: (s) => s.textsReadToday >= 3,
  },
  {
    id: 'quiz_champion',
    nameKey: 'achievements.quizChampion',
    descKey: 'achievements.quizChampionDesc',
    icon: 'quiz_champion',
    check: (s) => s.totalQuizzes >= 10,
  },
  {
    id: 'dedicated',
    nameKey: 'achievements.dedicated',
    descKey: 'achievements.dedicatedDesc',
    icon: 'dedicated',
    check: (s) => s.longestStreak >= 30,
  },
  {
    id: 'vocab_builder',
    nameKey: 'achievements.vocabBuilder',
    descKey: 'achievements.vocabBuilderDesc',
    icon: 'vocab_builder',
    check: (s) => s.totalWordsSaved >= 50,
  },
  {
    id: 'comeback',
    nameKey: 'achievements.comeback',
    descKey: 'achievements.comebackDesc',
    icon: 'comeback',
    check: (s) => s.totalXP >= 500,
  },
  {
    id: 'explorer',
    nameKey: 'achievements.explorer',
    descKey: 'achievements.explorerDesc',
    icon: 'explorer',
    check: (s) => s.totalTextsRead >= 25,
  },
  {
    id: 'perfectionist',
    nameKey: 'achievements.perfectionist',
    descKey: 'achievements.perfectionistDesc',
    icon: 'perfectionist',
    check: (s) => s.perfectQuizzes >= 5,
  },
]
