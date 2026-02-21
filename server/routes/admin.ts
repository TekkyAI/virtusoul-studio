import { Hono } from 'hono'
import { getGatewayClient } from '../lib/gateway.js'
import { readConfig, writeConfig, maskSensitive, listBackups, createBackup, restoreBackup } from '../lib/config.js'
import { getUpdateState, startUpdate, onUpdateOutput, getVersionInfo } from '../lib/updater.js'

const admin = new Hono()

// ── Agents ─────────────────────────────────────────────
admin.get('/agents', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ agents: [] })
  try {
    const res = await gw.request('agents.list', {})
    return c.json({ agents: (res as any).agents ?? [] })
  } catch { return c.json({ agents: [] }) }
})

admin.get('/agents/:id/prompt', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('agents.getPrompt', { agentId: c.req.param('id') })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.put('/agents/:id/prompt', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  const { content } = await c.req.json<{ content: string }>()
  try {
    const res = await gw.request('agents.setPrompt', { agentId: c.req.param('id'), content })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Config ─────────────────────────────────────────────
admin.get('/config', async (c) => {
  try {
    const config = await readConfig()
    return c.json({ config: maskSensitive(config) })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.put('/config', async (c) => {
  const { config } = await c.req.json<{ config: any }>()
  try {
    await writeConfig(config)
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.get('/config/backups', async (c) => {
  try {
    const backups = await listBackups()
    return c.json({ backups })
  } catch (e: any) { return c.json({ backups: [] }) }
})

admin.post('/config/backups', async (c) => {
  try {
    await createBackup()
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.post('/config/restore', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  try {
    await restoreBackup(name)
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Cron ───────────────────────────────────────────────
admin.get('/cron', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ jobs: [] })
  try {
    const res = await gw.request('cron.list', {})
    return c.json({ jobs: (res as any).jobs ?? [] })
  } catch { return c.json({ jobs: [] }) }
})

admin.post('/cron', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  const body = await c.req.json()
  try {
    const res = await gw.request('cron.add', body)
    return c.json(res, 201)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.delete('/cron/:id', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('cron.remove', { id: c.req.param('id') })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.post('/cron/:id/run', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('cron.run', { id: c.req.param('id') })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Sessions ───────────────────────────────────────────
admin.get('/sessions', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ sessions: [] })
  try {
    const res = await gw.request('sessions.list', {})
    return c.json({ sessions: (res as any).sessions ?? [] })
  } catch { return c.json({ sessions: [] }) }
})

// ── Exec Approvals ─────────────────────────────────────
admin.get('/approvals', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ approvals: [] })
  try {
    const res = await gw.request('exec.approvals.get', {})
    return c.json(res)
  } catch { return c.json({ approvals: [] }) }
})

admin.post('/approvals/:id/resolve', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  const { decision } = await c.req.json<{ decision: string }>()
  try {
    const res = await gw.request('exec.approval.resolve', { id: c.req.param('id'), decision })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Device Pairing ─────────────────────────────────────
admin.get('/devices', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ devices: [] })
  try {
    const res = await gw.request('device.pair.list', {})
    return c.json(res)
  } catch { return c.json({ devices: [] }) }
})

admin.post('/devices/:id/approve', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('device.pair.approve', { id: c.req.param('id') })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.post('/devices/:id/reject', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('device.pair.reject', { id: c.req.param('id') })
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Workspace (filesystem-based) ───────────────────────
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

const WORKSPACE_ROOT = join(homedir(), '.openclaw', 'workspace')

function safePath(p: string) {
  const resolved = resolve(WORKSPACE_ROOT, p.replace(/^\/+/, ''))
  if (!resolved.startsWith(WORKSPACE_ROOT)) throw new Error('Path traversal')
  return resolved
}

admin.get('/workspace', async (c) => {
  const p = c.req.query('path') || '/'
  try {
    const dir = safePath(p)
    await mkdir(dir, { recursive: true })
    const entries = await readdir(dir, { withFileTypes: true })
    const files = await Promise.all(entries.filter(e => !e.name.startsWith('.')).map(async (e) => {
      const full = join(dir, e.name)
      const s = await stat(full).catch(() => null)
      return { name: e.name, type: e.isDirectory() ? 'directory' : 'file', path: join(p === '/' ? '' : p, e.name), size: s?.size ?? 0 }
    }))
    return c.json({ files })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.get('/workspace/file', async (c) => {
  const p = c.req.query('path') || ''
  const download = c.req.query('download')
  try {
    const full = safePath(p)
    const content = await readFile(full, 'utf-8')
    if (download) {
      const name = p.split('/').pop() || 'file'
      c.header('Content-Disposition', `attachment; filename="${name}"`)
      c.header('Content-Type', 'application/octet-stream')
      return c.body(content)
    }
    return c.json({ content })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.put('/workspace/file', async (c) => {
  const { path: p, content } = await c.req.json<{ path: string; content: string }>()
  try {
    const full = safePath(p)
    await mkdir(join(full, '..'), { recursive: true })
    await writeFile(full, content, 'utf-8')
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Skill Setup ────────────────────────────────────────
admin.post('/skill-install', async (c) => {
  const { kind, bins, label } = await c.req.json<{ kind: string; bins?: string[]; label?: string }>()
  // Build install command from kind
  const cmds: Record<string, (bins: string[]) => string[]> = {
    brew: (b) => ['brew', 'install', ...b],
    node: (b) => ['npm', 'install', '-g', ...b],
    go: (b) => ['go', 'install', ...b.map(x => x + '@latest')],
    uv: (b) => ['uv', 'tool', 'install', ...b],
    pip: (b) => ['pip3', 'install', ...b],
  }
  const builder = cmds[kind]
  if (!builder || !bins?.length) return c.json({ error: `Unsupported install kind: ${kind}` }, 400)
  const args = builder(bins)

  const { spawn } = await import('child_process')
  return new Response(
    new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        const send = (event: string, data: any) => {
          try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch {}
        }
        send('stdout', { text: `$ ${args.join(' ')}\n` })
        const child = spawn(args[0], args.slice(1), {
          env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        child.stdout.on('data', (d: Buffer) => send('stdout', { text: d.toString() }))
        child.stderr.on('data', (d: Buffer) => send('stderr', { text: d.toString() }))
        child.on('close', (code) => { send('exit', { code }); controller.close() })
        child.on('error', (err) => { send('error', { text: err.message }); controller.close() })
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
  )
})

admin.post('/skill-setup', async (c) => {
  const { envVars, configKeys } = await c.req.json<{ envVars?: Record<string, string>; configKeys?: Record<string, string> }>()
  const results: string[] = []

  // Write env vars to ~/.openclaw/.env
  if (envVars && Object.keys(envVars).length > 0) {
    const { readFile, writeFile, mkdir } = await import('fs/promises')
    const { homedir } = await import('os')
    const { join } = await import('path')
    const envPath = join(homedir(), '.openclaw', '.env')
    let existing = ''
    try { existing = await readFile(envPath, 'utf-8') } catch {}
    const lines = existing.split('\n').filter(l => l.trim())
    for (const [key, val] of Object.entries(envVars)) {
      if (!val.trim()) continue
      const idx = lines.findIndex(l => l.startsWith(`${key}=`))
      if (idx >= 0) lines[idx] = `${key}=${val}`
      else lines.push(`${key}=${val}`)
      process.env[key] = val // Also set in current process
      results.push(`Set ${key}`)
    }
    await writeFile(envPath, lines.join('\n') + '\n', 'utf-8')
  }

  // Write config keys to openclaw.json
  if (configKeys && Object.keys(configKeys).length > 0) {
    const config = await readConfig()
    for (const [path, val] of Object.entries(configKeys)) {
      if (!val.trim()) continue
      const parts = path.split('.')
      let obj = config
      for (let i = 0; i < parts.length - 1; i++) obj = (obj[parts[i]] ??= {})
      obj[parts[parts.length - 1]] = val
      results.push(`Set ${path}`)
    }
    await writeConfig(config)
  }

  return c.json({ ok: true, results })
})

// ── Memory Settings ────────────────────────────────────
admin.get('/memory-settings', async (c) => {
  try {
    const config = await readConfig()
    const defaults = config?.agents?.defaults ?? {}
    return c.json({
      compaction: defaults.compaction ?? {},
      contextPruning: defaults.contextPruning ?? {},
      memorySearch: defaults.memorySearch ?? {},
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

admin.put('/memory-settings', async (c) => {
  const body = await c.req.json<{ compaction?: any; contextPruning?: any; memorySearch?: any }>()
  try {
    const config = await readConfig()
    const defaults = (config.agents ??= {}).defaults ??= {}
    if (body.compaction !== undefined) defaults.compaction = body.compaction
    if (body.contextPruning !== undefined) defaults.contextPruning = body.contextPruning
    if (body.memorySearch !== undefined) defaults.memorySearch = body.memorySearch
    await writeConfig(config)
    return c.json({ ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// ── Update (background) ────────────────────────────────
admin.get('/version', (c) => c.json(getVersionInfo()))

admin.post('/update', async (c) => {
  const result = startUpdate()
  return c.json(result, result.ok ? 200 : 409)
})

admin.get('/update', async (c) => {
  const state = getUpdateState()
  // SSE stream — sends existing output then live chunks
  return new Response(
    new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        const send = (event: string, data: any) => {
          try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)) } catch {}
        }
        // Send current state + buffered output
        send('state', { status: state.status, exitCode: state.exitCode, startedAt: state.startedAt })
        if (state.output) send('output', { text: state.output })
        // If not running, close immediately
        if (state.status !== 'running') { controller.close(); return }
        // Stream live output
        const unsub = onUpdateOutput((text) => {
          send('output', { text })
          const s = getUpdateState()
          if (s.status !== 'running') { send('state', { status: s.status, exitCode: s.exitCode }); unsub(); controller.close() }
        })
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } }
  )
})

// ── Health (for Mission Control) ───────────────────────
admin.get('/health', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ status: 'disconnected' })
  try {
    const res = await gw.request('health', {})
    return c.json(res)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

export default admin
