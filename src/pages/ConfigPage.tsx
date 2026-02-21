import { useState, useEffect, useCallback } from 'react'
import { Settings, Save, ChevronDown, Code, LayoutList, Trash2, AlertTriangle, Archive, RotateCcw } from 'lucide-react'

const MASKED = '••••••'
const SECTION_LABELS: Record<string, string> = {
  agents: '🤖 Agents', gateway: '🌐 Gateway', channels: '📡 Channels', auth: '🔑 Auth',
  commands: '⌨️ Commands', messages: '💬 Messages', plugins: '🔌 Plugins',
  meta: '📋 Meta', wizard: '🧙 Wizard',
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [rawJson, setRawJson] = useState('')
  const [mode, setMode] = useState<'form' | 'raw'>('form')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ meta: true, wizard: true })
  const [backups, setBackups] = useState<{ name: string; date: string; size: number }[]>([])
  const [showBackups, setShowBackups] = useState(false)
  const [restoring, setRestoring] = useState('')

  useEffect(() => {
    fetch('/api/admin/config').then(r => r.json()).then(d => {
      const c = d.config ?? {}
      setConfig(c)
      setRawJson(JSON.stringify(c, null, 2))
    }).catch(() => {})
  }, [])

  const loadBackups = () => {
    fetch('/api/admin/config/backups').then(r => r.json()).then(d => setBackups(d.backups ?? [])).catch(() => {})
  }

  const createBackup = async () => {
    const res = await fetch('/api/admin/config/backups', { method: 'POST' })
    if (res.ok) { loadBackups(); setSuccess(true); setTimeout(() => setSuccess(false), 2000) }
  }

  const restoreBackup = async (name: string) => {
    if (!confirm(`Restore config from "${name}"? This will overwrite the current config and may make the system unstable.`)) return
    setRestoring(name)
    const res = await fetch('/api/admin/config/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    if (res.ok) {
      // Reload config
      const d = await fetch('/api/admin/config').then(r => r.json())
      const c = d.config ?? {}
      setConfig(c); setRawJson(JSON.stringify(c, null, 2))
      setSuccess(true); setTimeout(() => setSuccess(false), 2000)
    } else { const d = await res.json(); setError(d.error ?? 'Restore failed') }
    setRestoring('')
  }

  const toggle = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }))

  const updateField = useCallback((path: string[], value: any) => {
    setConfig(prev => {
      const next = structuredClone(prev)
      let obj = next
      for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in obj)) obj[path[i]] = {}
        obj = obj[path[i]]
      }
      if (value === undefined) delete obj[path[path.length - 1]]
      else obj[path[path.length - 1]] = value
      setRawJson(JSON.stringify(next, null, 2))
      return next
    })
  }, [])

  async function handleSave() {
    setError(''); setSuccess(false)
    try {
      const data = mode === 'raw' ? JSON.parse(rawJson) : config
      setSaving(true)
      const res = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: data }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Save failed') }
      else { setSuccess(true); setTimeout(() => setSuccess(false), 2000) }
    } catch (e: any) { setError(mode === 'raw' ? 'Invalid JSON: ' + e.message : e.message) }
    finally { setSaving(false) }
  }

  const sections = Object.keys(config).sort((a, b) => {
    const order = ['agents', 'gateway', 'channels', 'auth', 'commands', 'messages', 'plugins', 'meta', 'wizard']
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
  })

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-[var(--muted-foreground)]" />
          <span className="text-sm font-semibold">OpenClaw Configuration</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-[10px]">
            <button onClick={() => setMode('form')} className={`px-2.5 py-1 flex items-center gap-1 ${mode === 'form' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
              <LayoutList size={11} /> Form
            </button>
            <button onClick={() => { setMode('raw'); setRawJson(JSON.stringify(config, null, 2)) }} className={`px-2.5 py-1 flex items-center gap-1 ${mode === 'raw' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
              <Code size={11} /> JSON
            </button>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 disabled:opacity-40">
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-medium text-amber-300">Editing configuration may make the system unstable</p>
          <p className="text-[var(--muted-foreground)]">Incorrect values can prevent the gateway from starting. Create a backup before making changes so you can restore if something goes wrong.</p>
        </div>
        <button onClick={() => { setShowBackups(!showBackups); if (!showBackups) loadBackups() }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">
          <Archive size={12} /> Backups
        </button>
      </div>

      {/* Backup/Restore Panel */}
      {showBackups && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Config Backups</h3>
            <button onClick={createBackup} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90">
              <Archive size={12} /> Create Backup Now
            </button>
          </div>
          {backups.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">No backups found. Backups are also created automatically on every save.</p>
          ) : (
            <div className="space-y-1">
              {backups.map(b => (
                <div key={b.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--muted)]/50">
                  <div>
                    <p className="text-xs font-mono">{b.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">{b.date} · {(b.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => restoreBackup(b.name)} disabled={restoring === b.name}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] border border-[var(--border)] hover:bg-amber-500/10 hover:border-amber-500/30 disabled:opacity-40">
                    <RotateCcw size={11} /> {restoring === b.name ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[var(--muted-foreground)]">Backups stored in ~/.openclaw/backups/</p>
        </div>
      )}

      {error && <p className="text-sm text-[var(--destructive)] bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">✓ Configuration saved</p>}

      {mode === 'raw' ? (
        <textarea value={rawJson} onChange={e => setRawJson(e.target.value)} spellCheck={false}
          className="w-full h-[calc(100vh-220px)] p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-mono text-[var(--foreground)] resize-none outline-none leading-relaxed" />
      ) : (
        <div className="space-y-2">
          {sections.map(section => (
            <div key={section} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <button onClick={() => toggle(section)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/50 transition-colors">
                <span className="text-sm font-medium">{SECTION_LABELS[section] ?? section}</span>
                <ChevronDown size={14} className={`text-[var(--muted-foreground)] transition-transform ${collapsed[section] ? '' : 'rotate-180'}`} />
              </button>
              {!collapsed[section] && (
                <div className="px-4 pb-4 space-y-2 border-t border-[var(--border)]">
                  <FormFields value={config[section]} path={[section]} onChange={updateField} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[var(--muted-foreground)]">Sensitive fields (tokens, passwords) are masked with •••••• by the server. Saving will preserve masked values unchanged.</p>
    </div>
  )
}

function FormFields({ value, path, onChange }: { value: any; path: string[]; onChange: (path: string[], val: any) => void }) {
  if (value === null || value === undefined) return null

  if (typeof value !== 'object') {
    return <FieldInput value={value} path={path} onChange={onChange} />
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-1 pl-2 border-l border-[var(--border)]">
        {value.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <div className="flex-1"><FormFields value={item} path={[...path, String(i)]} onChange={onChange} /></div>
            <button onClick={() => { const next = [...value]; next.splice(i, 1); onChange(path, next) }} className="p-1 text-[var(--muted-foreground)] hover:text-red-400 mt-1"><Trash2 size={11} /></button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 pt-2">
      {Object.entries(value).map(([k, v]) => (
        <div key={k}>
          {typeof v === 'object' && v !== null && !Array.isArray(v) ? (
            <details className="group">
              <summary className="text-xs font-medium text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] py-1">{k}</summary>
              <div className="pl-3 border-l border-[var(--border)] ml-1 mt-1">
                <FormFields value={v} path={[...path, k]} onChange={onChange} />
              </div>
            </details>
          ) : (
            <div className="flex items-center gap-3">
              <label className="text-xs text-[var(--muted-foreground)] w-36 shrink-0 truncate" title={k}>{k}</label>
              <div className="flex-1"><FormFields value={v} path={[...path, k]} onChange={onChange} /></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FieldInput({ value, path, onChange }: { value: any; path: string[]; onChange: (path: string[], val: any) => void }) {
  const isMasked = value === MASKED
  const key = path[path.length - 1]

  if (typeof value === 'boolean') {
    return (
      <button onClick={() => onChange(path, !value)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${value ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-400'}`}>
        {value ? 'true' : 'false'}
      </button>
    )
  }

  if (typeof value === 'number') {
    return <input type="number" value={value} onChange={e => onChange(path, Number(e.target.value))}
      className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
  }

  // Enum-like fields
  const enumOptions = getEnumOptions(key)
  if (enumOptions) {
    return (
      <select value={String(value)} onChange={e => onChange(path, e.target.value)}
        className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--ring)]">
        {enumOptions.map(o => <option key={o} value={o}>{o}</option>)}
        {!enumOptions.includes(String(value)) && <option value={String(value)}>{String(value)}</option>}
      </select>
    )
  }

  return <input type={isMasked ? 'password' : 'text'} value={String(value)} onChange={e => onChange(path, e.target.value)}
    placeholder={isMasked ? 'Masked — leave blank to keep' : ''}
    className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
}

function getEnumOptions(key: string): string[] | null {
  const enums: Record<string, string[]> = {
    mode: ['local', 'remote', 'token', 'password', 'off', 'serve', 'funnel', 'safeguard', 'auto'],
    bind: ['loopback', 'lan'],
    dmPolicy: ['pairing', 'open', 'closed'],
    groupPolicy: ['allowlist', 'open'],
    native: ['auto', 'on', 'off'],
    nativeSkills: ['auto', 'on', 'off'],
    streamMode: ['partial', 'full', 'off'],
    ackReactionScope: ['all', 'group-mentions', 'none'],
  }
  return enums[key] ?? null
}
