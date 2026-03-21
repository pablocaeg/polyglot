import type { LanguageDirection, SkillLevel, GeneratedText, WordTranslation, TextCategory } from '../types'

// When VITE_API_URL is set, use it as base (e.g. "http://95.217.117.84:8090").
// When empty/undefined, falls back to relative paths (same-origin deployment).
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || ''

interface GenerateResponse {
  title: string
  content: string
  fullTranslation: string
  wordTranslations?: WordTranslation[]
}

export async function generateText(
  direction: LanguageDirection,
  skillLevel: SkillLevel,
  topic?: string,
  category?: TextCategory
): Promise<GeneratedText> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction, skillLevel, topic, category }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `Generation failed (${res.status})`)
  }

  const data: GenerateResponse = await res.json()

  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    direction,
    skillLevel,
    topic: topic || undefined,
    category: category || undefined,
    title: data.title,
    content: data.content,
    fullTranslation: data.fullTranslation,
    wordTranslations: data.wordTranslations || [],
  }
}

/** Phase 2: fetch vocabulary in batches, calling onBatch as each arrives */
export async function fetchVocabulary(
  content: string,
  direction: LanguageDirection,
  skillLevel: SkillLevel,
  onBatch?: (words: WordTranslation[]) => void
): Promise<WordTranslation[]> {
  // Split text into sentences, then group into batches of ~3 sentences
  const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.trim())
  const batchSize = 3
  const batches: string[] = []

  for (let i = 0; i < sentences.length; i += batchSize) {
    batches.push(sentences.slice(i, i + batchSize).join(' '))
  }

  // If text is short enough (≤1 batch), just do a single request
  if (batches.length <= 1) {
    const words = await fetchVocabBatch(content, direction, skillLevel)
    onBatch?.(words)
    return words
  }

  // Fire all batches in parallel, merge results as they arrive
  const allWords: WordTranslation[] = []
  const seen = new Set<string>()

  await Promise.all(
    batches.map(async (batch) => {
      const words = await fetchVocabBatch(batch, direction, skillLevel)
      // Deduplicate across batches
      const newWords = words.filter((w) => {
        const key = w.word.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      if (newWords.length > 0) {
        allWords.push(...newWords)
        onBatch?.([...allWords])
      }
    })
  )

  return allWords
}

async function fetchVocabBatch(
  content: string,
  direction: LanguageDirection,
  skillLevel: SkillLevel
): Promise<WordTranslation[]> {
  try {
    const res = await fetch(`${API_BASE}/api/vocab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, direction, skillLevel }),
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.wordTranslations || []).filter(
      (w: WordTranslation) => w.word?.trim() && w.translation?.trim()
    )
  } catch {
    return []
  }
}

/* ── Quick word translation ───────────────────── */

export async function translateWord(
  word: string,
  fromLang: string,
  toLang: string,
  context?: string
): Promise<{ translation: string; pos?: string; grammar?: string }> {
  const res = await fetch(`${API_BASE}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, fromLang, toLang, context }),
  })

  if (!res.ok) {
    throw new Error('Translation failed')
  }

  return res.json()
}

/* ── Word AI Chat ─────────────────────────────── */

export interface ChatRequestOptions {
  messages: { role: string; content: string }[]
  direction: LanguageDirection
  skillLevel: SkillLevel
  word: string
  translation: string
  pos?: string
  context: string
}

export async function sendChatMessage(
  options: ChatRequestOptions,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
      signal,
    })

    if (!res.ok) {
      const error = await res.text()
      onError(error || `Chat failed (${res.status})`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No response stream')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onChunk(content)
        } catch {
          // skip malformed chunks
        }
      }
    }

    onDone()
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      onError(e.message)
    }
  }
}
