import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken, SESSION_COOKIE } from '../lib/auth.js'

const auth = new Hono()

// ── Setup endpoints (first-run only) ────────────────────
auth.get('/setup-status', async (c) => {
  try {
    const [user] = await db.select().from(users).limit(1)
    // Setup is needed if no users exist or password is still 'changeme'
    const needsSetup = !user || (process.env.ADMIN_PASSWORD === 'changeme' && !user.passwordHash)
    return c.json({ needsSetup })
  } catch { return c.json({ needsSetup: true }) }
})

auth.post('/setup/password', async (c) => {
  const { password } = await c.req.json<{ password: string }>()
  if (!password || password.length < 6) return c.json({ error: 'Password must be at least 6 characters' }, 400)
  const hash = await hashPassword(password)
  try {
    const [existing] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
    if (existing) {
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, existing.id))
    } else {
      await db.insert(users).values({ email: 'admin@localhost', name: 'Admin', passwordHash: hash, role: 'admin' })
    }
    // Set session so user is logged in after setup
    const [user] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
    const token = createSessionToken(user.id)
    setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

auth.post('/setup/complete', (c) => c.json({ ok: true }))

// Ensure admin user exists on import
export async function ensureAdminUser() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) { console.warn('[auth] ADMIN_PASSWORD not set — skipping admin user creation'); return }
  try {
    const existing = await db.select().from(users).limit(1)
    if (existing.length > 0) return
    const hash = await hashPassword(password)
    await db.insert(users).values({ email: 'admin@localhost', name: 'Admin', passwordHash: hash, role: 'admin' })
    console.log('[auth] Admin user created')
  } catch (e: any) {
    // DB might not be ready yet — that's ok, will retry on first login
    console.warn('[auth] Could not ensure admin user:', e.message)
  }
}

auth.post('/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>()
  if (!password) return c.json({ error: 'Password required' }, 400)

  // Try DB user first
  try {
    const [user] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
    if (user && await verifyPassword(password, user.passwordHash)) {
      const token = createSessionToken(user.id)
      setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
      return c.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } })
    }
  } catch {
    // DB not ready — fall through to env check
  }

  // Fallback: check against ADMIN_PASSWORD env directly (before first migration)
  if (password === process.env.ADMIN_PASSWORD) {
    const token = createSessionToken('admin-bootstrap')
    setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
    return c.json({ ok: true, user: { id: 'admin-bootstrap', name: 'Admin', email: 'admin@localhost' } })
  }

  return c.json({ error: 'Invalid password' }, 401)
})

auth.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return c.json({ error: 'Not authenticated' }, 401)
  const userId = verifySessionToken(token)
  if (!userId) return c.json({ error: 'Invalid session' }, 401)

  if (userId === 'admin-bootstrap') {
    return c.json({ user: { id: userId, name: 'Admin', email: 'admin@localhost' } })
  }

  try {
    const [user] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!user) return c.json({ error: 'User not found' }, 401)
    return c.json({ user })
  } catch {
    return c.json({ user: { id: userId, name: 'Admin', email: 'admin@localhost' } })
  }
})

export default auth
