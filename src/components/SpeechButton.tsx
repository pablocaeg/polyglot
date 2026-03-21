import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Language } from '../types'
import { useSpeech } from '../hooks/useSpeech'
import { useSettingsStore } from '../stores/useSettingsStore'

interface SpeechButtonProps {
  text: string
  lang: Language
  onHighlight?: (index: number | null, length: number) => void
  onPausedChange?: (paused: boolean) => void
  onEnded?: () => void
  onRestart?: () => void
  autoPlay?: boolean
  inline?: boolean
}

/* ── Icon components ─────────────────────────── */

function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
function PlayIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z" /></svg>
}
function PauseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
}
function StopIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
}
function RestartIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
}

/* ── Main component ──────────────────────────── */

export default function SpeechButton({ text, lang, onHighlight, onPausedChange, onEnded, onRestart, autoPlay, inline }: SpeechButtonProps) {
  const { loading, speaking, paused, speak, pause, resume, stop, highlightIndex, highlightLength } = useSpeech()
  const { t } = useTranslation()
  const ttsSpeed = useSettingsStore((s) => s.readingPreferences.ttsSpeed)

  const isActive = loading || speaking || paused
  const isPlaying = speaking && !paused

  // Track whether stop/restart was called manually to suppress onEnded
  const manualActionRef = useRef(false)

  function handlePlayPause() {
    if (loading) return
    if (isPlaying) {
      pause()
    } else if (paused) {
      resume()
    } else {
      manualActionRef.current = false
      speak(text, lang, ttsSpeed)
    }
  }

  function handleStop() {
    manualActionRef.current = true
    stop()
  }

  function handleRestart() {
    manualActionRef.current = true
    stop()
    onRestart?.()
    // speak is called via autoPlay effect when text changes from onRestart,
    // or we trigger it explicitly after a microtask for non-sentence-mode
    requestAnimationFrame(() => {
      manualActionRef.current = false
    })
  }

  // Restart TTS when speed changes mid-playback
  const prevSpeedRef = useRef(ttsSpeed)
  useEffect(() => {
    if (prevSpeedRef.current !== ttsSpeed && (speaking || paused)) {
      prevSpeedRef.current = ttsSpeed
      speak(text, lang, ttsSpeed)
    } else {
      prevSpeedRef.current = ttsSpeed
    }
  }, [ttsSpeed, speaking, paused, speak, text, lang])

  // Auto-play when text prop changes and autoPlay is true
  const prevTextRef = useRef(text)
  useEffect(() => {
    if (autoPlay && text && text !== prevTextRef.current) {
      speak(text, lang, ttsSpeed)
    }
    prevTextRef.current = text
  }, [text, autoPlay, speak, lang, ttsSpeed])

  // Detect natural TTS end (not from manual stop/restart)
  const wasSpeakingRef = useRef(false)
  useEffect(() => {
    if (wasSpeakingRef.current && !speaking && !loading && !paused && !manualActionRef.current) {
      onEnded?.()
    }
    wasSpeakingRef.current = speaking
  }, [speaking, loading, paused, onEnded])

  // Stop on unmount
  useEffect(() => {
    return () => stop()
  }, [stop])

  // Propagate highlight
  useEffect(() => {
    onHighlight?.((speaking || paused) ? highlightIndex : null, highlightLength)
  }, [speaking, paused, highlightIndex, highlightLength, onHighlight])

  // Propagate paused state
  useEffect(() => {
    onPausedChange?.(paused)
  }, [paused, onPausedChange])

  /* ── Inline toolbar ── */
  if (inline) {
    return (
      <div className="inline-flex items-center card rounded-[var(--t-r-btn)] p-0.5 gap-0.5">
        {/* Play / Pause */}
        <button
          onClick={handlePlayPause}
          disabled={loading}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-[var(--t-r-btn)] text-[11px] font-semibold font-ui transition-all active:scale-[0.95] ${
            loading
              ? 'text-th-accent cursor-wait'
              : isPlaying
                ? 'bg-th-accent text-th-on-accent'
                : paused
                  ? 'bg-th-warning/15 text-th-warning'
                  : 'text-th-secondary hover:text-th-primary hover:bg-th-surface-hover'
          }`}
        >
          {loading ? <Spinner className="w-3.5 h-3.5" /> : isPlaying ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
          <span>{loading ? t('common.listen') : isPlaying ? t('common.pause') : paused ? t('common.resume') : t('common.listen')}</span>
        </button>

        {/* Stop */}
        {isActive && (
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-8 h-8 rounded-[var(--t-r-btn)] text-th-muted hover:text-th-danger hover:bg-th-danger/10 transition-all active:scale-[0.95]"
            aria-label={t('common.stop')}
          >
            <StopIcon />
          </button>
        )}

        {/* Restart */}
        {isActive && (
          <button
            onClick={handleRestart}
            className="flex items-center justify-center w-8 h-8 rounded-[var(--t-r-btn)] text-th-muted hover:text-th-primary hover:bg-th-surface-hover transition-all active:scale-[0.95]"
            aria-label={t('common.restart')}
          >
            <RestartIcon />
          </button>
        )}
      </div>
    )
  }

  /* ── FAB ── */
  return (
    <button
      onClick={handlePlayPause}
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-8 right-4 lg:right-8 z-30 w-14 h-14 rounded-[var(--t-r-btn)] shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90 ${
        loading
          ? 'bg-th-accent cursor-wait'
          : isPlaying
            ? 'bg-th-accent hover:brightness-110'
            : paused
              ? 'bg-th-warning hover:brightness-110'
              : 'bg-th-accent hover:brightness-110 hover:scale-105 fab-pulse'
      }`}
    >
      {loading ? (
        <Spinner className="w-6 h-6 text-th-on-accent" />
      ) : isPlaying ? (
        <PauseIcon className="w-6 h-6 text-th-on-accent" />
      ) : paused ? (
        <PlayIcon className="w-6 h-6 text-th-on-accent" />
      ) : (
        <svg className="w-6 h-6 text-th-on-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      )}
    </button>
  )
}
