import { Hono } from 'hono'
import { db } from '../db/index.js'
import { traces } from '../db/schema.js'
import { desc, eq, sql, and, gte } from 'drizzle-orm'

const observability = new Hono()

// Record a trace (called internally by middleware)
export async function recordTrace(t: {
  traceType: string; method?: string; path?: string
  status?: number; durationMs?: number; meta?: Record<string, unknown>; error?: string
}) {
  try { await db.insert(traces).values(t) } catch {}
}

// Middleware to auto-trace API requests
export async function traceMiddleware(c: any, next: () => Promise<void>) {
  const start = Date.now()
  await next()
  const path = new URL(c.req.url).pathname
  // Skip health checks and static files
  if (path === '/api/health' || !path.startsWith('/api/')) return
  recordTrace({
    traceType: 'api',
    method: c.req.method,
    path,
    status: c.res.status,
    durationMs: Date.now() - start,
  })
}

// GET /api/traces — list recent traces
observability.get('/', async (c) => {
  const type = c.req.query('type')
  const limit = Math.min(Number(c.req.query('limit') || 100), 500)
  const where = type ? eq(traces.traceType, type) : undefined
  const rows = await db.select().from(traces).where(where).orderBy(desc(traces.createdAt)).limit(limit)
  return c.json(rows)
})

// GET /api/traces/stats — aggregated stats
observability.get('/stats', async (c) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24h
  const rows = await db.select({
    traceType: traces.traceType,
    count: sql<number>`count(*)::int`,
    avgMs: sql<number>`round(avg(${traces.durationMs}))::int`,
    p95Ms: sql<number>`round(percentile_cont(0.95) within group (order by ${traces.durationMs}))::int`,
    errCount: sql<number>`count(*) filter (where ${traces.status} >= 400)::int`,
  }).from(traces).where(gte(traces.createdAt, since)).groupBy(traces.traceType)

  const total = await db.select({
    count: sql<number>`count(*)::int`,
    avgMs: sql<number>`round(avg(${traces.durationMs}))::int`,
  }).from(traces).where(gte(traces.createdAt, since))

  return c.json({ byType: rows, total: total[0] })
})

// DELETE /api/traces — prune old traces
observability.delete('/', async (c) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  await db.delete(traces).where(sql`${traces.createdAt} < ${cutoff}`)
  return c.json({ ok: true })
})

export default observability
