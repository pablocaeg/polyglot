import { Router } from 'express'
import { query, healthCheck } from '../db.js'

const router = Router()

router.get('/api/health', async (_req, res) => {
  const dbHealth = await healthCheck()

  let textCount = 0
  let dictCount = 0

  if (dbHealth.ok) {
    try {
      const [texts, dict] = await Promise.all([
        query('SELECT COUNT(*)::int AS count FROM texts'),
        query('SELECT COUNT(*)::int AS count FROM dictionary_entries'),
      ])
      textCount = texts?.rows[0]?.count || 0
      dictCount = dict?.rows[0]?.count || 0
    } catch {}
  }

  res.json({
    status: dbHealth.ok ? 'healthy' : 'degraded',
    database: dbHealth,
    texts: textCount,
    dictionaryEntries: dictCount,
    uptime: process.uptime(),
  })
})

router.get('/api/texts/count', async (req, res) => {
  try {
    const { target, native, level, category } = req.query

    let sql = 'SELECT COUNT(*)::int AS count FROM texts WHERE 1=1'
    const params: unknown[] = []
    let i = 1

    if (target) { sql += ` AND target_lang = $${i++}`; params.push(target) }
    if (native) { sql += ` AND native_lang = $${i++}`; params.push(native) }
    if (level)  { sql += ` AND skill_level = $${i++}`; params.push(level) }
    if (category) { sql += ` AND category = $${i++}`; params.push(category) }

    const result = await query(sql, params)
    res.json({ count: result?.rows[0]?.count || 0 })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
