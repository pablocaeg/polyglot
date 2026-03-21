import cors from 'cors'
import express, { type Express } from 'express'
import rateLimit from 'express-rate-limit'

/** AI endpoints: 20 req/min per IP */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: JSON.stringify({ error: 'Too many requests, slow down.' }),
  standardHeaders: true,
  legacyHeaders: false,
})

/** DB-backed endpoints: 120 req/min per IP */
export const dbLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: JSON.stringify({ error: 'Too many requests, slow down.' }),
  standardHeaders: true,
  legacyHeaders: false,
})

/** Apply global middleware to the Express app */
export function applyMiddleware(app: Express) {
  app.use(express.json({ limit: '16kb' }))

  if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN }))
  }
}
