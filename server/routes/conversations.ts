import { Hono } from 'hono'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { conversations, messages } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const convRouter = new Hono()
convRouter.use('/*', requireAuth)

// List conversations
convRouter.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await db.select().from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.archived, false)))
    .orderBy(desc(conversations.updatedAt))
    .limit(100)
  return c.json({ conversations: rows })
})

// Get conversation with messages
convRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
  if (!conv) return c.json({ error: 'Not found' }, 404)
  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)
  return c.json({ conversation: conv, messages: msgs })
})

// Create conversation
convRouter.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ title?: string; agentId?: string; sessionKey?: string }>()
  const [conv] = await db.insert(conversations).values({
    userId,
    title: body.title ?? 'New Chat',
    agentId: body.agentId,
    sessionKey: body.sessionKey,
  }).returning()
  return c.json({ conversation: conv }, 201)
})

// Update conversation
convRouter.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ title?: string; pinned?: boolean; folderId?: string | null; archived?: boolean }>()
  const [conv] = await db.update(conversations).set(body).where(eq(conversations.id, id)).returning()
  if (!conv) return c.json({ error: 'Not found' }, 404)
  return c.json({ conversation: conv })
})

// Delete conversation
convRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(conversations).where(eq(conversations.id, id))
  return c.json({ ok: true })
})

// Add message to conversation
convRouter.post('/:id/messages', async (c) => {
  const conversationId = c.req.param('id')
  const body = await c.req.json<{ role: string; content: string; blocks?: unknown[]; runId?: string; metadata?: Record<string, unknown>; generationTimeMs?: number }>()
  const [msg] = await db.insert(messages).values({
    conversationId,
    role: body.role,
    content: body.content,
    blocks: body.blocks ?? [],
    runId: body.runId,
    metadata: body.metadata,
    generationTimeMs: body.generationTimeMs,
  }).returning()

  // Touch conversation updatedAt
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId))

  return c.json({ message: msg }, 201)
})

export default convRouter
