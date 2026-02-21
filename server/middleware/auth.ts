import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { verifySessionToken, SESSION_COOKIE } from '../lib/auth.js'

export const requireAuth = createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  const userId = verifySessionToken(token)
  if (!userId) return c.json({ error: 'Invalid session' }, 401)
  c.set('userId', userId)
  await next()
})
