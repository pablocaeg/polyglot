import type { Language, TTSSpeed } from '../types'

const SPEED_RATES: Record<TTSSpeed, string> = {
  slow: '-30%',
  normal: '-10%',
  fast: '+15%',
}


const LANG_CODES: Record<Language, string> = {
  pl: 'pl-PL',
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
}

interface WordCue {
  text: string
  start: number
  end: number
}

interface CachedTTS {
  audio: string    // base64
  cues: WordCue[]
}

/* ── TTS cache ─────────────────────────────────── */

const ttsCache = new Map<string, Promise<CachedTTS | null>>()
const MAX_CACHE = 10

function cacheKey(text: string, lang: string, speed: TTSSpeed = 'normal'): string {
  return `${lang}:${speed}:${text.slice(0, 200)}`
}

async function fetchTTS(text: string, lang: Language, speed: TTSSpeed = 'normal', signal?: AbortSignal): Promise<CachedTTS | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang, rate: SPEED_RATES[speed] }),
      signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.audio) return null
    return { audio: data.audio, cues: data.cues || [] }
  } catch {
    return null
  }
}

/** Preload TTS audio into cache — call when text is loaded, before user clicks play */
export function preload(text: string, lang: Language, speed: TTSSpeed = 'normal'): void {
  const key = cacheKey(text, lang, speed)
  if (ttsCache.has(key)) return

  if (ttsCache.size >= MAX_CACHE) {
    const firstKey = ttsCache.keys().next().value
    if (firstKey) ttsCache.delete(firstKey)
  }

  ttsCache.set(key, fetchTTS(text, lang, speed))
}

/** Preload a short phrase (e.g. for WordChat speakable segments) */
export function preloadShort(text: string, lang: Language, speed: TTSSpeed = 'normal'): void {
  if (text.length > 500) return
  preload(text, lang, speed)
}

/** Clear cached entries (e.g. when speed changes) */
export function clearCache(): void {
  ttsCache.clear()
}

/* ── Playback state ────────────────────────────── */

let currentAudio: HTMLAudioElement | null = null
let cueTimer: number | null = null

export async function speak(
  text: string,
  lang: Language,
  onBoundary?: (charIndex: number, charLength: number) => void,
  onEnd?: () => void,
  onPlay?: () => void,
  speed: TTSSpeed = 'normal'
) {
  stop()

  try {
    // Check cache first, otherwise fetch
    const key = cacheKey(text, lang, speed)
    let cached = ttsCache.has(key) ? await ttsCache.get(key) : null

    if (!cached) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000)
      cached = await fetchTTS(text, lang, speed, controller.signal)
      clearTimeout(timeout)

      if (cached) {
        ttsCache.set(key, Promise.resolve(cached))
      }
    }

    if (!cached) throw new Error('TTS failed')

    const audioBytes = Uint8Array.from(atob(cached.audio), (c) => c.charCodeAt(0))
    const blob = new Blob([audioBytes], { type: 'audio/mpeg' })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio

    if (onBoundary && cached.cues.length > 0) {
      const mappedCues = mapCuesToText(cached.cues, text)
      let lastCueIdx = -1

      function pollCue() {
        if (!currentAudio || currentAudio.paused) return
        const t = currentAudio.currentTime

        for (let i = mappedCues.length - 1; i >= 0; i--) {
          if (t >= mappedCues[i].start) {
            if (i > lastCueIdx) {
              lastCueIdx = i
              onBoundary!(mappedCues[i].charIndex, mappedCues[i].charLength)
            }
            break
          }
        }

        cueTimer = requestAnimationFrame(pollCue)
      }

      audio.addEventListener('playing', () => {
        cueTimer = requestAnimationFrame(pollCue)
      })
    }

    audio.addEventListener('playing', () => {
      onPlay?.()
    }, { once: true })

    audio.addEventListener('ended', () => {
      cleanup(url)
      onEnd?.()
    })

    audio.addEventListener('error', () => {
      cleanup(url)
      onEnd?.()
    })

    await audio.play()
  } catch {
    try {
      onPlay?.()
      speakFallback(text, lang, onBoundary, onEnd, speed)
    } catch {
      onEnd?.()
    }
  }
}

/* ── Internals ─────────────────────────────────── */

interface MappedCue {
  start: number
  end: number
  charIndex: number
  charLength: number
}

function mapCuesToText(cues: WordCue[], text: string): MappedCue[] {
  const result: MappedCue[] = []
  let searchFrom = 0

  for (const cue of cues) {
    const word = cue.text
    if (!word) continue

    const idx = text.indexOf(word, searchFrom)
    if (idx === -1) {
      const lower = text.toLowerCase()
      const altIdx = lower.indexOf(word.toLowerCase(), searchFrom)
      if (altIdx !== -1) {
        result.push({ start: cue.start, end: cue.end, charIndex: altIdx, charLength: word.length })
        searchFrom = altIdx + word.length
      }
      continue
    }

    result.push({ start: cue.start, end: cue.end, charIndex: idx, charLength: word.length })
    searchFrom = idx + word.length
  }

  return result
}

function cleanup(url?: string) {
  if (cueTimer !== null) {
    cancelAnimationFrame(cueTimer)
    cueTimer = null
  }
  if (url) URL.revokeObjectURL(url)
  currentAudio = null
}

const FALLBACK_RATES: Record<TTSSpeed, number> = { slow: 0.65, normal: 0.85, fast: 1.1 }

function speakFallback(
  text: string,
  lang: Language,
  onBoundary?: (charIndex: number, charLength: number) => void,
  onEnd?: () => void,
  speed: TTSSpeed = 'normal'
) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = LANG_CODES[lang]
  utterance.rate = FALLBACK_RATES[speed]

  if (onBoundary) {
    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        onBoundary(e.charIndex, e.charLength)
      }
    }
  }

  if (onEnd) {
    utterance.onend = onEnd
  }

  utterance.onerror = () => {
    onEnd?.()
  }

  speechSynthesis.speak(utterance)
}

export function pause() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause()
  }
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause()
  }
}

export function resume() {
  if (currentAudio && currentAudio.paused && currentAudio.src) {
    currentAudio.play()
  }
  if (speechSynthesis.paused) {
    speechSynthesis.resume()
  }
}

export function stop() {
  if (cueTimer !== null) {
    cancelAnimationFrame(cueTimer)
    cueTimer = null
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  speechSynthesis.cancel()
}

export function isPaused(): boolean {
  return (currentAudio !== null && currentAudio.paused && currentAudio.currentTime > 0) || speechSynthesis.paused
}

export function isSpeaking(): boolean {
  return (currentAudio !== null && !currentAudio.paused) || speechSynthesis.speaking
}
