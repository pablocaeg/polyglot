import { Router } from 'express'
import { dbLimiter } from '../middleware.js'
import { VOICE_MAP } from '../lib/constants.js'

const router = Router()

router.post('/api/tts', dbLimiter, async (req, res) => {
  try {
    const text = String(req.body.text || '').slice(0, 2000)
    const lang = String(req.body.lang || 'pl')
    const rate = String(req.body.rate || '-10%')

    if (!text) {
      res.status(400).json({ error: 'Missing text' })
      return
    }

    const voice = VOICE_MAP[lang] || VOICE_MAP['pl']

    const { EdgeTTS } = await import('node-edge-tts')
    const { tmpdir } = await import('os')
    const { join } = await import('path')
    const { readFile, unlink } = await import('fs/promises')
    const { randomUUID } = await import('crypto')

    const tmpPath = join(tmpdir(), `polyglot-tts-${randomUUID()}.mp3`)

    const tts = new EdgeTTS({
      voice,
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      rate,
      saveSubtitles: true,
      timeout: 15000,
    })

    await Promise.race([
      tts.ttsPromise(text, tmpPath),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TTS generation timed out')), 20000)
      ),
    ])

    const audioBuffer = await readFile(tmpPath)

    const cuesPath = tmpPath + '.json'
    let cues: { text: string; start: number; end: number }[] = []
    try {
      const raw = await readFile(cuesPath, 'utf8')
      const parsed = JSON.parse(raw) as { part: string; start: number; end: number }[]
      cues = parsed.map((c) => ({
        text: c.part.trim(),
        start: c.start / 1000,
        end: c.end / 1000,
      }))
      unlink(cuesPath).catch(() => {})
    } catch {}
    unlink(tmpPath).catch(() => {})

    res.json({ audio: audioBuffer.toString('base64'), cues })
  } catch (e: any) {
    console.error('TTS error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

export default router
