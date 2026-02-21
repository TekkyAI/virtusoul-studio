import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const search = new Hono()
search.use('/*', requireAuth)

search.get('/', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ results: [] })

  try {
    // Use ILIKE as a simple fallback — tsvector can be added when migration runs
    const results = await db.execute(sql`
      SELECT m.id, m.content, m.role, m.created_at, m.conversation_id,
             c.title as conversation_title
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.content ILIKE ${'%' + q + '%'}
      ORDER BY m.created_at DESC
      LIMIT 20
    `)
    return c.json({ results: results.rows })
  } catch {
    return c.json({ results: [] })
  }
})

export default search
