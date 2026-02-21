import { useState, useEffect, useCallback } from 'react'
import { Server, Plus, Trash2, Power, RefreshCw, X, Wrench } from 'lucide-react'

type McpServer = {
  name: string
  transport: 'stdio' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  enabled: boolean
  tools?: string[]
}

export default function McpManagerPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', transport: 'stdio' as 'stdio' | 'sse', command: '', args: '', url: '', env: '' })
  const [selected, setSelected] = useState<McpServer | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/mcp/servers')
      if (r.ok) setServers(await r.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (list: McpServer[]) => {
    await fetch('/api/mcp/servers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) })
    setServers(list)
  }

  const toggle = (name: string) => {
    save(servers.map(s => s.name === name ? { ...s, enabled: !s.enabled } : s))
  }

  const remove = (name: string) => {
    if (!confirm(`Remove ${name}?`)) return
    save(servers.filter(s => s.name !== name))
  }

  const add = () => {
    if (!form.name.trim()) return
    const srv: McpServer = {
      name: form.name.trim(),
      transport: form.transport,
      enabled: true,
      ...(form.transport === 'stdio'
        ? { command: form.command, args: form.args.split(/\s+/).filter(Boolean) }
        : { url: form.url }),
      ...(form.env.trim() ? { env: Object.fromEntries(form.env.split('\n').map(l => l.split('=', 2))) } : {}),
    }
    save([...servers, srv])
    setForm({ name: '', transport: 'stdio', command: '', args: '', url: '', env: '' })
    setShowAdd(false)
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">MCP Servers</h1>
          <span className="text-xs text-[var(--muted-foreground)]">{servers.length} servers</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
            <Plus size={12} className="inline mr-1" />Add Server
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-4 space-y-3">
          <div className="flex gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Server name"
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]" />
            <select value={form.transport} onChange={e => setForm(f => ({ ...f, transport: e.target.value as any }))}
              className="px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]">
              <option value="stdio">stdio</option>
              <option value="sse">SSE (HTTP)</option>
            </select>
          </div>
          {form.transport === 'stdio' ? (
            <div className="flex gap-3">
              <input value={form.command} onChange={e => setForm(f => ({ ...f, command: e.target.value }))} placeholder="Command (e.g. npx)"
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]" />
              <input value={form.args} onChange={e => setForm(f => ({ ...f, args: e.target.value }))} placeholder="Args (space-separated)"
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]" />
            </div>
          ) : (
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Server URL (http://...)"
              className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]" />
          )}
          <textarea value={form.env} onChange={e => setForm(f => ({ ...f, env: e.target.value }))} placeholder="Environment vars (KEY=VALUE, one per line)"
            className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)] h-16 resize-none font-mono" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--muted)]">Cancel</button>
            <button onClick={add} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">Add</button>
          </div>
        </div>
      )}

      {servers.length === 0 && !loading && (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <Server size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No MCP servers configured</p>
          <p className="text-xs mt-1">Add a server to connect external tools</p>
        </div>
      )}

      <div className="space-y-2">
        {servers.map(s => (
          <div key={s.name} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${s.enabled ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                {s.transport === 'stdio' ? `${s.command} ${(s.args || []).join(' ')}` : s.url}
              </p>
              {s.tools && s.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.tools.map(t => (
                    <span key={t} className="px-1.5 py-0.5 text-[9px] rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                      <Wrench size={8} className="inline mr-0.5" />{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{s.transport}</span>
            <button onClick={() => toggle(s.name)} title={s.enabled ? 'Disable' : 'Enable'}
              className={`p-1.5 rounded-lg transition-colors ${s.enabled ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
              <Power size={14} />
            </button>
            <button onClick={() => remove(s.name)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-red-500/10 hover:text-red-400">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
