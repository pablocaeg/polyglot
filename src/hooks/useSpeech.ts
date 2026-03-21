import { useState, useCallback, useRef } from 'react'
import type { Language, TTSSpeed } from '../types'
import * as speechService from '../services/speech'

export function useSpeech() {
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null)
  const [highlightLength, setHighlightLength] = useState(0)
  const generationRef = useRef(0)
  const lastHighlightRef = useRef<number | null>(null)

  // Always stops any current playback and starts fresh — no toggle behavior
  const speak = useCallback((text: string, lang: Language, speed: TTSSpeed = 'normal') => {
    speechService.stop()

    const gen = ++generationRef.current
    lastHighlightRef.current = null
    setLoading(true)
    setSpeaking(false)
    setPaused(false)
    setHighlightIndex(null)
    setHighlightLength(0)

    speechService.speak(
      text,
      lang,
      (charIndex, charLength) => {
        if (generationRef.current !== gen) return
        if (charIndex === lastHighlightRef.current) return
        lastHighlightRef.current = charIndex
        setSpeaking(true)
        setHighlightIndex(charIndex)
        setHighlightLength(charLength)
      },
      () => {
        if (generationRef.current !== gen) return
        setSpeaking(false)
        setPaused(false)
        setLoading(false)
        setHighlightIndex(null)
        setHighlightLength(0)
        lastHighlightRef.current = null
      },
      () => {
        if (generationRef.current !== gen) return
        setLoading(false)
        setSpeaking(true)
      },
      speed
    )
  }, [])

  const pause = useCallback(() => {
    speechService.pause()
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    speechService.resume()
    setPaused(false)
  }, [])

  const stop = useCallback(() => {
    generationRef.current++
    speechService.stop()
    setSpeaking(false)
    setPaused(false)
    setLoading(false)
    setHighlightIndex(null)
    setHighlightLength(0)
    lastHighlightRef.current = null
  }, [])

  return { loading, speaking, paused, highlightIndex, highlightLength, speak, pause, resume, stop }
}
