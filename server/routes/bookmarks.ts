import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { bookmarks } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const bm = new Hono()
bm.use('/*', requireAuth)

bm.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt)).limit(100)
  return c.json({ bookmarks: rows })
})

bm.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ messageId?: string; conversationId?: string; selectedText?: string; note?: string }>()
  const [row] = await db.insert(bookmarks).values({ userId, ...body }).returning()
  return c.json({ bookmark: row }, 201)
})

bm.delete('/:id', async (c) => {
  await db.delete(bookmarks).where(eq(bookmarks.id, c.req.param('id')))
  return c.json({ ok: true })
})

export default bm
