import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { WordTranslation, LanguageDirection, ChatMessage } from '../types'
import { useSettingsStore } from '../stores/useSettingsStore'
import { sendChatMessage } from '../services/api'
import { speak, stop, preloadShort } from '../services/speech'

interface WordChatProps {
  word: WordTranslation
  context: string
  direction: LanguageDirection
  onClose: () => void
}

/* ── Helpers ──────────────────────────────────── */

/** Parse **bold** and *italic* into React elements */
function formatInlineMarkdown(text: string): (string | React.ReactElement)[] {
  const parts: (string | React.ReactElement)[] = []
  // Match **bold** first, then *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index))
    }
    if (match[1]) {
      parts.push(<strong key={match.index} className="font-semibold text-th-primary">{match[1]}</strong>)
    } else if (match[2]) {
      parts.push(<em key={match.index}>{match[2]}</em>)
    }
    last = regex.lastIndex
  }

  if (last < text.length) {
    parts.push(text.slice(last))
  }

  return parts.length > 0 ? parts : [text]
}

/** Strip markdown markers from raw content before splitting into speakable segments */
function stripMarkdown(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
}

type Segment = { type: 'text' | 'speakable'; content: string }

function parseSpeakable(text: string): Segment[] {
  const parts: Segment[] = []
  const regex = /«([^»]+)»/g
  let last = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', content: text.slice(last, match.index) })
    }
    parts.push({ type: 'speakable', content: match[1] })
    last = regex.lastIndex
  }

  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

function collectSpeakable(text: string): string {
  return parseSpeakable(text)
    .filter((s) => s.type === 'speakable')
    .map((s) => s.content)
    .join('. ')
}

/* ── Main component ──────────────────────────── */

const MAX_INPUT = 200
const MAX_MESSAGES = 20

export default function WordChat({ word, context, direction, onClose }: WordChatProps) {
  const { skillLevel } = useSettingsStore()
  const { t } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef('')
  const inputRef = useRef<HTMLInputElement>(null)

  const quickActions = [
    { label: t('wordChat.useInPhrase'), icon: 'phrase', prompt: t('wordChat.phrasePrompt', { word: word.word }) },
    { label: t('wordChat.synonyms'), icon: 'sync', prompt: t('wordChat.synonymsPrompt', { word: word.word }) },
    { label: t('wordChat.opposites'), icon: 'arrows', prompt: t('wordChat.oppositePrompt', { word: word.word }) },
    ...(word.pos === 'verb'
      ? [{ label: t('wordChat.conjugate'), icon: 'grid', prompt: t('wordChat.conjugatePrompt', { word: word.word }) }]
      : []),
    ...(word.pos === 'noun' && direction.target === 'pl'
      ? [{ label: t('wordChat.cases'), icon: 'list', prompt: t('wordChat.casesPrompt', { word: word.word }) }]
      : []),
    { label: t('wordChat.memoryTip'), icon: 'bulb', prompt: t('wordChat.memoryTipPrompt', { word: word.word }) },
    { label: t('wordChat.formalVsCasual'), icon: 'formal', prompt: t('wordChat.formalPrompt', { word: word.word }) },
  ]

  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    // Scroll only the messages container, not the page
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  // Lock body scroll while chat is open
  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  useEffect(() => {
    // Small delay so the animation finishes before focusing, use preventScroll
    const timer = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      abortRef.current?.abort()
      stop()
    }
  }, [onClose])

  async function handleSend(text?: string) {
    const messageText = (text || input).trim()
    if (!messageText || streaming || messages.length >= MAX_MESSAGES) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText.slice(0, MAX_INPUT),
    }

    const updated = [...messages, userMessage]
    setMessages(updated)
    setInput('')
    setError(null)
    setStreaming(true)
    setStreamingContent('')
    contentRef.current = ''

    abortRef.current = new AbortController()

    const history = updated.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    await sendChatMessage(
      {
        messages: history,
        direction,
        skillLevel,
        word: word.word,
        translation: word.translation,
        pos: word.pos,
        context,
      },
      (chunk) => {
        contentRef.current += chunk
        setStreamingContent(contentRef.current)
      },
      () => {
        const final = contentRef.current
        if (final) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: final },
          ])
          // Preload TTS for speakable segments
          const speakableRegex = /«([^»]+)»/g
          let m
          while ((m = speakableRegex.exec(final)) !== null) {
            preloadShort(m[1], direction.target)
          }
        }
        contentRef.current = ''
        setStreamingContent('')
        setStreaming(false)
      },
      (err) => {
        setError(err)
        setStreaming(false)
        setStreamingContent('')
        contentRef.current = ''
      },
      abortRef.current.signal
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    handleSend()
  }

  function handleSpeak(text: string, segId?: string) {
    stop()
    setSpeakingId(segId || null)
    speak(text, direction.target, undefined, () => setSpeakingId(null))
  }

  function handleSpeakAll(content: string) {
    const all = collectSpeakable(content)
    if (all) handleSpeak(all, `all-${content.slice(0, 20)}`)
  }

  const atLimit = messages.length >= MAX_MESSAGES

  return createPortal(
    <>
      {/* Backdrop — separate fixed layer */}
      <div className="fixed inset-0 z-[60] bg-th-overlay backdrop-blur-sm" onClick={onClose} />

      {/* Chat panel — separate fixed layer, not nested inside backdrop
          Mobile: bottom sheet starting near top of screen
          Desktop: centered card */}
      <div
        className="
          fixed z-[61] inset-x-0 top-12 bottom-0
          sm:inset-auto sm:top-[10vh] sm:bottom-[10vh] sm:left-1/2 sm:-translate-x-1/2
          sm:w-[28rem]
          flex flex-col overflow-hidden
          rounded-t-[var(--t-r-popup)] sm:rounded-[var(--t-r-popup)]
          animate-slide-up sm:animate-scale-in
        "
        style={{
          background: 'var(--t-bg)',
          border: 'var(--t-card-border, 1px solid var(--t-border))',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >

        {/* ── Header ── */}
        <div className="shrink-0 border-b border-th-border">
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-2">
            <div className="w-8 h-1 rounded-full bg-th-muted/30" />
          </div>

          <div className="flex items-start gap-3 px-4 pt-3 sm:pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-th-primary font-heading truncate">{word.word}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {word.translation && (
                  <span className="text-th-accent text-sm font-medium font-body truncate">{word.translation}</span>
                )}
                {word.pos && (
                  <span className="text-[9px] font-medium uppercase tracking-wider text-th-muted bg-th-surface-hover rounded-[var(--t-r-badge)] px-1.5 py-0.5 font-ui shrink-0">{word.pos}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-th-muted hover:text-th-primary transition-colors rounded-[var(--t-r-btn)] hover:bg-th-surface-hover shrink-0 mt-0.5"
              aria-label={t('common.close')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => handleSend(a.prompt)}
                disabled={streaming || atLimit}
                className="shrink-0 px-3 py-1.5 rounded-[var(--t-r-badge)] text-[11px] font-medium font-ui bg-th-surface-hover text-th-secondary hover:text-th-primary hover:bg-th-accent/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed active:scale-95"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Messages — this is the only scrollable part ── */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-6 animate-fade-in">
              <p className="text-th-muted text-xs font-body">{t('wordChat.tapSuggestion')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-th-accent text-th-on-accent rounded-br-sm'
                    : 'bg-th-surface-hover text-th-primary rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <AssistantBubble
                    content={msg.content}
                    direction={direction}
                    speakingId={speakingId}
                    onSpeak={handleSpeak}
                    onSpeakAll={() => handleSpeakAll(msg.content)}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap font-body">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {streaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-th-surface-hover px-3.5 py-2.5">
                <AssistantBubble
                  content={streamingContent}
                  direction={direction}
                  speakingId={speakingId}
                  onSpeak={handleSpeak}
                  onSpeakAll={() => {}}
                  isStreaming
                />
              </div>
            </div>
          )}

          {streaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-th-surface-hover px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-th-accent/40 typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-th-danger/10 border border-th-danger/20 text-th-danger text-xs rounded-[var(--t-r-btn)] px-4 py-2.5 font-ui">
                {t('wordChat.somethingWentWrong')}
              </div>
            </div>
          )}

          {atLimit && (
            <div className="flex justify-center">
              <p className="text-th-muted text-xs py-2 font-ui">{t('wordChat.conversationLimit')}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 px-3 py-2 border-t border-th-border"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
              placeholder={atLimit ? t('wordChat.limitReached') : t('wordChat.askAboutWord', { word: word.word })}
              disabled={streaming || atLimit}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-full bg-th-surface-hover border border-th-border text-th-primary text-sm font-body placeholder:text-th-muted focus:outline-none focus:border-th-accent/40 focus:ring-1 focus:ring-th-accent/20 disabled:opacity-30 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming || atLimit}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-th-accent hover:bg-th-accent-hover transition-all text-th-on-accent disabled:opacity-15 disabled:cursor-not-allowed active:scale-95 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}

/* ── Assistant message bubble ────────────────── */

function AssistantBubble({
  content,
  direction: _direction, // eslint-disable-line @typescript-eslint/no-unused-vars
  speakingId,
  onSpeak,
  onSpeakAll,
  isStreaming,
}: {
  content: string
  direction: LanguageDirection
  speakingId: string | null
  onSpeak: (text: string, segId: string) => void
  onSpeakAll: () => void
  isStreaming?: boolean
}) {
  const { t } = useTranslation()
  // Strip markdown before parsing speakable so ** doesn't break across segments
  const cleaned = stripMarkdown(content)
  const segments = parseSpeakable(cleaned)
  const hasSpeakable = segments.some((s) => s.type === 'speakable')

  return (
    <div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed font-body">
        {segments.map((seg, i) => {
          if (seg.type === 'speakable') {
            const segId = `${i}-${seg.content}`
            const active = speakingId === segId
            return (
              <button
                key={i}
                onClick={() => onSpeak(seg.content, segId)}
                className={`inline-flex items-center gap-0.5 font-medium transition-all duration-200 ${
                  active
                    ? 'text-th-accent bg-th-accent/15 rounded px-1 -mx-1'
                    : 'text-th-accent hover:text-th-accent-hover underline decoration-th-accent/30 underline-offset-2 hover:decoration-th-accent/60'
                }`}
              >
                {seg.content}
                <svg className="w-3 h-3 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              </button>
            )
          }
          return <span key={i}>{formatInlineMarkdown(seg.content)}</span>
        })}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-th-accent/50 ml-0.5 animate-pulse align-middle rounded-sm" />
        )}
      </p>

      {hasSpeakable && !isStreaming && (
        <button
          onClick={onSpeakAll}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-th-muted hover:text-th-secondary transition-colors font-ui"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          {t('wordChat.playAllExamples')}
        </button>
      )}
    </div>
  )
}
