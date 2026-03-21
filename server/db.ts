/**
 * PostgreSQL connection pool for Polyglot.
 *
 * Uses DATABASE_URL env var. Falls back gracefully — if no DB is configured,
 * the server still works (LLM-only mode).
 */

import pg from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(): pg.Pool | null {
  if (pool) return pool

  const url = process.env.DATABASE_URL
  if (!url) {
    console.warn('DATABASE_URL not set — running in LLM-only mode (no DB)')
    return null
  }

  pool = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  pool.on('error', (err) => {
    console.error('Unexpected PG pool error:', err.message)
  })

  return pool
}

/** Convenience query — returns null if DB is not configured */
export async function query(text: string, params?: unknown[]): Promise<pg.QueryResult | null> {
  const p = getPool()
  if (!p) return null
  return p.query(text, params)
}

/** Check DB connectivity */
export async function healthCheck(): Promise<{ ok: boolean; error?: string }> {
  const p = getPool()
  if (!p) return { ok: false, error: 'DATABASE_URL not configured' }
  try {
    await p.query('SELECT 1')
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

/** Graceful shutdown */
export async function close(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
