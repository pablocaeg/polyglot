import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { GeneratedText, DifficultWord, DailyActivity, QueuedText } from '../types'

interface PolyglotDB extends DBSchema {
  texts: {
    key: string
    value: GeneratedText
    indexes: { 'by-created': number }
  }
  difficultWords: {
    key: string
    value: DifficultWord
    indexes: { 'by-textId': string; 'by-created': number; 'by-nextReview': number }
  }
  dailyActivity: {
    key: string
    value: DailyActivity
    indexes: { 'by-date': string }
  }
  offlineQueue: {
    key: string
    value: QueuedText
    indexes: { 'by-created': number }
  }
}

let dbPromise: Promise<IDBPDatabase<PolyglotDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PolyglotDB>('polyglot', 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // V1 stores
        if (oldVersion < 1) {
          const textStore = db.createObjectStore('texts', { keyPath: 'id' })
          textStore.createIndex('by-created', 'createdAt')

          const wordStore = db.createObjectStore('difficultWords', { keyPath: 'id' })
          wordStore.createIndex('by-textId', 'textId')
          wordStore.createIndex('by-created', 'createdAt')
          wordStore.createIndex('by-nextReview', 'srsNextReview')
        }

        // V2 migration
        if (oldVersion < 2) {
          // Add new object stores
          if (!db.objectStoreNames.contains('dailyActivity')) {
            const activityStore = db.createObjectStore('dailyActivity', { keyPath: 'date' })
            activityStore.createIndex('by-date', 'date')
          }

          if (!db.objectStoreNames.contains('offlineQueue')) {
            const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id' })
            queueStore.createIndex('by-created', 'generatedAt')
          }

          // Add nextReview index to existing difficultWords store if it doesn't exist
          const wordStore = tx.objectStore('difficultWords')
          if (!wordStore.indexNames.contains('by-nextReview')) {
            wordStore.createIndex('by-nextReview', 'srsNextReview')
          }

          // Migrate existing difficult words: add SRS defaults
          const cursorReq = wordStore.openCursor()
          cursorReq.then(async (cursor) => {
            while (cursor) {
              const word = cursor.value
              if (word.mastery === undefined) {
                const updated = {
                  ...word,
                  mastery: word.learned ? 'mastered' : 'new',
                  srsEaseFactor: 2.5,
                  srsInterval: word.learned ? 30 : 0,
                  srsRepetitions: word.learned ? 6 : 0,
                  srsNextReview: word.learned
                    ? Date.now() + 30 * 24 * 60 * 60 * 1000
                    : Date.now(),
                  reviewHistory: [],
                } as DifficultWord
                await cursor.update(updated)
              }
              cursor = await cursor.continue()
            }
          })
        }
      },
    })
  }
  return dbPromise
}

// ── Seed preloaded texts on first launch ────────────

const SEED_KEY = 'polyglot-seeded'

export async function seedIfNeeded(): Promise<void> {
  if (localStorage.getItem(SEED_KEY)) return
  const db = await getDB()
  const { SEED_TEXTS } = await import('../data/seedTexts')
  const tx = db.transaction('texts', 'readwrite')
  for (const text of SEED_TEXTS) {
    const exists = await tx.store.get(text.id)
    if (!exists) await tx.store.put(text)
  }
  await tx.done
  localStorage.setItem(SEED_KEY, '1')
}

// ── Texts ────────────────────────────────────────────

export async function getAllTexts(): Promise<GeneratedText[]> {
  await seedIfNeeded()
  const db = await getDB()
  const texts = await db.getAllFromIndex('texts', 'by-created')
  return texts.reverse()
}

export async function getText(id: string): Promise<GeneratedText | undefined> {
  const db = await getDB()
  return db.get('texts', id)
}

export async function saveText(text: GeneratedText): Promise<void> {
  const db = await getDB()
  await db.put('texts', text)
}

export async function deleteText(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['texts', 'difficultWords'], 'readwrite')
  await tx.objectStore('texts').delete(id)
  const wordIndex = tx.objectStore('difficultWords').index('by-textId')
  let cursor = await wordIndex.openCursor(id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function updateText(id: string, updates: Partial<GeneratedText>): Promise<void> {
  const db = await getDB()
  const text = await db.get('texts', id)
  if (text) {
    await db.put('texts', { ...text, ...updates })
  }
}

// ── Difficult Words ──────────────────────────────────

export async function getAllDifficultWords(): Promise<DifficultWord[]> {
  const db = await getDB()
  const words = await db.getAllFromIndex('difficultWords', 'by-created')
  return words.reverse()
}

export async function getDifficultWordsByText(textId: string): Promise<DifficultWord[]> {
  const db = await getDB()
  return db.getAllFromIndex('difficultWords', 'by-textId', textId)
}

export async function saveDifficultWord(word: DifficultWord): Promise<void> {
  const db = await getDB()
  await db.put('difficultWords', word)
}

export async function deleteDifficultWord(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('difficultWords', id)
}

export async function updateDifficultWordLearned(id: string, learned: boolean): Promise<void> {
  const db = await getDB()
  const word = await db.get('difficultWords', id)
  if (word) {
    word.learned = learned
    await db.put('difficultWords', word)
  }
}

export async function updateDifficultWord(id: string, updates: Partial<DifficultWord>): Promise<void> {
  const db = await getDB()
  const word = await db.get('difficultWords', id)
  if (word) {
    await db.put('difficultWords', { ...word, ...updates })
  }
}

export async function getWordsDueForReview(now: number = Date.now()): Promise<DifficultWord[]> {
  const db = await getDB()
  const range = IDBKeyRange.upperBound(now)
  return db.getAllFromIndex('difficultWords', 'by-nextReview', range)
}

// ── Daily Activity ───────────────────────────────────

export async function getDailyActivity(date: string): Promise<DailyActivity | undefined> {
  const db = await getDB()
  return db.get('dailyActivity', date)
}

export async function saveDailyActivity(activity: DailyActivity): Promise<void> {
  const db = await getDB()
  await db.put('dailyActivity', activity)
}

export async function getAllDailyActivity(): Promise<DailyActivity[]> {
  const db = await getDB()
  return db.getAll('dailyActivity')
}

// ── Offline Queue ────────────────────────────────────

export async function getAllQueuedTexts(): Promise<QueuedText[]> {
  const db = await getDB()
  return db.getAll('offlineQueue')
}

export async function saveQueuedText(qt: QueuedText): Promise<void> {
  const db = await getDB()
  await db.put('offlineQueue', qt)
}

export async function deleteQueuedText(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('offlineQueue', id)
}
