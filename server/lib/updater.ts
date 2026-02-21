import { spawn, type ChildProcess, execSync } from 'child_process'

export interface UpdateState {
  status: 'idle' | 'running' | 'done' | 'error'
  output: string
  exitCode: number | null
  startedAt: number | null
}

// ── Version cache ──────────────────────────────────────
let versionCache = { current: '', latest: '', checkedAt: 0 }

async function checkVersions() {
  try {
    const current = execSync('openclaw --version', { encoding: 'utf-8', timeout: 5000 }).trim()
    let latest = ''
    try {
      const res = await fetch('https://registry.npmjs.org/openclaw/latest')
      const d = await res.json() as any
      latest = d?.version ?? ''
    } catch {}
    versionCache = { current, latest, checkedAt: Date.now() }
  } catch {}
}

// Check on import + every 30 min
checkVersions()
setInterval(checkVersions, 30 * 60 * 1000)

export function getVersionInfo() { return { ...versionCache } }

const state: UpdateState = { status: 'idle', output: '', exitCode: null, startedAt: null }
let child: ChildProcess | null = null
const listeners = new Set<(chunk: string) => void>()

export function getUpdateState(): UpdateState {
  return { ...state }
}

export function startUpdate(): { ok: boolean; error?: string } {
  if (state.status === 'running') return { ok: false, error: 'Update already in progress' }

  state.status = 'running'
  state.output = ''
  state.exitCode = null
  state.startedAt = Date.now()

  const append = (text: string) => {
    state.output += text
    listeners.forEach(fn => fn(text))
  }

  append('$ openclaw update --yes\n')

  child = spawn('openclaw', ['update', '--yes', '--no-color'], {
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })

  child.stdout?.on('data', (d: Buffer) => append(d.toString()))
  child.stderr?.on('data', (d: Buffer) => append(d.toString()))

  child.on('close', (code) => {
    state.exitCode = code ?? 1
    state.status = code === 0 ? 'done' : 'error'
    append(code === 0 ? '\n✅ Update complete. Gateway will restart automatically.\n' : `\n❌ Update failed (exit code ${code})\n`)
    child = null
  })

  child.on('error', (err) => {
    state.status = 'error'
    append(`\n❌ ${err.message}\n`)
    child = null
  })

  return { ok: true }
}

export function onUpdateOutput(fn: (chunk: string) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
