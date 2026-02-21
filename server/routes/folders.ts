import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { folders } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const fld = new Hono()
fld.use('/*', requireAuth)

fld.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await db.select().from(folders).where(eq(folders.userId, userId)).orderBy(folders.sortOrder)
  return c.json({ folders: rows })
})

fld.post('/', async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json<{ name: string }>()
  const [row] = await db.insert(folders).values({ userId, name }).returning()
  return c.json({ folder: row }, 201)
})

fld.patch('/:id', async (c) => {
  const body = await c.req.json<{ name?: string; sortOrder?: number }>()
  const [row] = await db.update(folders).set(body).where(eq(folders.id, c.req.param('id'))).returning()
  return c.json({ folder: row })
})

fld.delete('/:id', async (c) => {
  await db.delete(folders).where(eq(folders.id, c.req.param('id')))
  return c.json({ ok: true })
})

export default fld
