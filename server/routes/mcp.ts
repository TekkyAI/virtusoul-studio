import { Hono } from 'hono'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const mcp = new Hono()
const CONFIG_PATH = join(homedir(), '.openclaw', 'studio-mcp.json')

function loadServers() {
  if (!existsSync(CONFIG_PATH)) return []
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) } catch { return [] }
}

function saveServers(servers: any[]) {
  writeFileSync(CONFIG_PATH, JSON.stringify(servers, null, 2))
}

mcp.get('/servers', (c) => c.json(loadServers()))

mcp.put('/servers', async (c) => {
  const servers = await c.req.json()
  if (!Array.isArray(servers)) return c.json({ error: 'Expected array' }, 400)
  saveServers(servers)
  return c.json({ ok: true })
})

export default mcp
