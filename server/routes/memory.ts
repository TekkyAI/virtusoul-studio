import { Hono } from 'hono'
import { db } from '../db/index.js'
import { memoryNodes, memoryEdges } from '../db/schema.js'
import { desc, eq, sql, ilike, inArray, or } from 'drizzle-orm'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const memory = new Hono()

const MEMORY_DIR = join(homedir(), '.openclaw', 'workspace', 'memory')
const MEMORY_TYPES = ['Fact', 'Preference', 'Decision', 'Identity', 'Event', 'Observation', 'Goal', 'Todo'] as const

// Classify memory content into a type using simple heuristics
function classifyMemory(content: string): { type: string; importance: number } {
  const lower = content.toLowerCase()
  if (/\b(prefer|like|dislike|want|favorite|rather)\b/.test(lower)) return { type: 'Preference', importance: 6 }
  if (/\b(decided|decision|chose|agreed|resolved)\b/.test(lower)) return { type: 'Decision', importance: 7 }
  if (/\b(i am|my name|i work|i live|identity|role)\b/.test(lower)) return { type: 'Identity', importance: 8 }
  if (/\b(happened|event|meeting|call|yesterday|today|last week)\b/.test(lower)) return { type: 'Event', importance: 5 }
  if (/\b(noticed|observed|seems|appears|pattern)\b/.test(lower)) return { type: 'Observation', importance: 4 }
  if (/\b(goal|aim|target|objective|plan to|want to achieve)\b/.test(lower)) return { type: 'Goal', importance: 8 }
  if (/\b(todo|task|need to|should|must|reminder)\b/.test(lower)) return { type: 'Todo', importance: 7 }
  return { type: 'Fact', importance: 5 }
}

// Detect edges between nodes based on content similarity keywords
function detectEdges(nodes: { id: string; content: string; memoryType: string }[]): { fromId: string; toId: string; relation: string }[] {
  const edges: { fromId: string; toId: string; relation: string }[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      // Same type = RelatedTo
      if (a.memoryType === b.memoryType) {
        const wordsA = new Set(a.content.toLowerCase().split(/\W+/))
        const wordsB = new Set(b.content.toLowerCase().split(/\W+/))
        const overlap = [...wordsA].filter(w => wordsB.has(w) && w.length > 4).length
        if (overlap >= 3) edges.push({ fromId: a.id, toId: b.id, relation: 'RelatedTo' })
      }
      // Todo/Goal → Decision = CausedBy
      if ((a.memoryType === 'Decision' && (b.memoryType === 'Goal' || b.memoryType === 'Todo')))
        edges.push({ fromId: a.id, toId: b.id, relation: 'CausedBy' })
      // Observation → Fact = Updates
      if (a.memoryType === 'Observation' && b.memoryType === 'Fact') {
        const wordsA = new Set(a.content.toLowerCase().split(/\W+/))
        const wordsB = new Set(b.content.toLowerCase().split(/\W+/))
        const overlap = [...wordsA].filter(w => wordsB.has(w) && w.length > 4).length
        if (overlap >= 2) edges.push({ fromId: a.id, toId: b.id, relation: 'Updates' })
      }
    }
  }
  return edges
}

// POST /api/memory/sync — ingest memory files from OpenClaw workspace
memory.post('/sync', async (c) => {
  let files: string[] = []
  try {
    const entries = readdirSync(MEMORY_DIR)
    files = entries.filter(f => f.endsWith('.md') || f.endsWith('.txt'))
  } catch {
    return c.json({ error: 'Memory directory not found', path: MEMORY_DIR }, 404)
  }

  // Get existing source files to avoid re-ingesting
  const existing = await db.select({ sourceFile: memoryNodes.sourceFile }).from(memoryNodes)
  const existingFiles = new Set(existing.map(e => e.sourceFile))

  const newNodes: any[] = []
  for (const file of files) {
    if (existingFiles.has(file)) continue
    const content = readFileSync(join(MEMORY_DIR, file), 'utf-8').trim()
    if (!content) continue

    // Split by sections (## headers or --- separators)
    const sections = content.split(/(?:^|\n)(?:#{1,3}\s|---)/m).filter(s => s.trim())
    for (const section of sections) {
      const text = section.trim()
      if (text.length < 10) continue
      const { type, importance } = classifyMemory(text)
      newNodes.push({ content: text.slice(0, 2000), memoryType: type, importance, sourceFile: file })
    }
  }

  if (newNodes.length > 0) {
    const inserted = await db.insert(memoryNodes).values(newNodes).returning({ id: memoryNodes.id, content: memoryNodes.content, memoryType: memoryNodes.memoryType })

    // Detect and insert edges
    const edges = detectEdges(inserted)
    if (edges.length > 0) await db.insert(memoryEdges).values(edges)
  }

  return c.json({ ingested: newNodes.length, files: files.length, newFiles: files.length - existingFiles.size })
})

// GET /api/memory/nodes — list/search memory nodes
memory.get('/nodes', async (c) => {
  const type = c.req.query('type')
  const q = c.req.query('q')
  const limit = Math.min(Number(c.req.query('limit') || 200), 500)

  let where
  if (type && q) where = sql`${memoryNodes.memoryType} = ${type} AND ${memoryNodes.content} ILIKE ${'%' + q + '%'}`
  else if (type) where = eq(memoryNodes.memoryType, type)
  else if (q) where = ilike(memoryNodes.content, `%${q}%`)

  const nodes = await db.select().from(memoryNodes).where(where).orderBy(desc(memoryNodes.importance)).limit(limit)
  return c.json(nodes)
})

// GET /api/memory/graph — nodes + edges for visualization
memory.get('/graph', async (c) => {
  const nodes = await db.select().from(memoryNodes).orderBy(desc(memoryNodes.importance)).limit(200)
  if (nodes.length === 0) return c.json({ nodes: [], edges: [] })

  const nodeIds = nodes.map(n => n.id)
  const edges = nodeIds.length > 0
    ? await db.select().from(memoryEdges).where(
        or(inArray(memoryEdges.fromId, nodeIds), inArray(memoryEdges.toId, nodeIds))
      )
    : []

  return c.json({ nodes, edges })
})

// GET /api/memory/stats — type distribution
memory.get('/stats', async (c) => {
  const rows = await db.select({
    memoryType: memoryNodes.memoryType,
    count: sql<number>`count(*)::int`,
    avgImportance: sql<number>`round(avg(${memoryNodes.importance}))::int`,
  }).from(memoryNodes).groupBy(memoryNodes.memoryType)

  const total = await db.select({ count: sql<number>`count(*)::int` }).from(memoryNodes)
  const edgeCount = await db.select({ count: sql<number>`count(*)::int` }).from(memoryEdges)

  return c.json({ byType: rows, totalNodes: total[0]?.count ?? 0, totalEdges: edgeCount[0]?.count ?? 0 })
})

// DELETE /api/memory/nodes — clear all and re-sync
memory.delete('/nodes', async (c) => {
  await db.delete(memoryEdges)
  await db.delete(memoryNodes)
  return c.json({ ok: true })
})

export default memory
