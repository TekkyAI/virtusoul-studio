import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, Trash2, Filter } from 'lucide-react'

type Trace = {
  id: string; traceType: string; method?: string; path?: string
  status?: number; durationMs?: number; error?: string; createdAt: string
}
type Stats = {
  byType: { traceType: string; count: number; avgMs: number; p95Ms: number; errCount: number }[]
  total: { count: number; avgMs: number }
}

const TYPE_COLORS: Record<string, string> = {
  api: 'bg-blue-400', ws: 'bg-purple-400', cli: 'bg-amber-400',
}

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const q = filter ? `?type=${filter}` : ''
    const [t, s] = await Promise.all([
      fetch(`/api/traces${q}`).then(r => r.json()).catch(() => []),
      fetch('/api/traces/stats').then(r => r.json()).catch(() => null),
    ])
    setTraces(t)
    setStats(s)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const prune = async () => {
    await fetch('/api/traces', { method: 'DELETE' })
    load()
  }

  const statusColor = (s?: number) => {
    if (!s) return 'text-[var(--muted-foreground)]'
    if (s < 300) return 'text-emerald-400'
    if (s < 400) return 'text-amber-400'
    return 'text-red-400'
  }

  const latencyColor = (ms?: number) => {
    if (!ms) return ''
    if (ms < 100) return 'text-emerald-400'
    if (ms < 500) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">Observability</h1>
          <span className="text-xs text-[var(--muted-foreground)]">Last 24h</span>
        </div>
        <div className="flex gap-2">
          <button onClick={prune} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]" title="Prune old traces">
            <Trash2 size={14} />
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Requests" value={stats.total?.count ?? 0} />
          <StatCard label="Avg Latency" value={`${stats.total?.avgMs ?? 0}ms`} />
          {stats.byType.map(s => (
            <StatCard key={s.traceType} label={`${s.traceType.toUpperCase()} — p95`} value={`${s.p95Ms}ms`}
              sub={`${s.count} reqs, ${s.errCount} errors`} />
          ))}
        </div>
      )}

      {/* Latency Distribution */}
      {stats?.byType && stats.byType.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-4">
          <h2 className="text-xs font-bold mb-3">Latency by Type</h2>
          <div className="space-y-2">
            {stats.byType.map(s => {
              const maxMs = Math.max(...stats.byType.map(x => x.p95Ms), 1)
              return (
                <div key={s.traceType} className="flex items-center gap-3">
                  <span className="text-[10px] w-8 text-right font-mono">{s.traceType}</span>
                  <div className="flex-1 h-5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${TYPE_COLORS[s.traceType] || 'bg-zinc-400'}`}
                      style={{ width: `${(s.p95Ms / maxMs) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono w-14 text-right">{s.p95Ms}ms</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setFilter('')} className={`px-2.5 py-1 text-[10px] rounded-lg ${!filter ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>All</button>
        {['api', 'ws', 'cli'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-2.5 py-1 text-[10px] rounded-lg ${filter === t ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>{t.toUpperCase()}</button>
        ))}
      </div>

      {/* Trace List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="grid grid-cols-[60px_50px_1fr_60px_60px_140px] gap-2 px-4 py-2 text-[9px] font-medium text-[var(--muted-foreground)] border-b border-[var(--border)]">
          <span>Type</span><span>Method</span><span>Path</span><span>Status</span><span>Latency</span><span>Time</span>
        </div>
        {traces.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-[var(--muted-foreground)]">No traces yet</div>
        )}
        {traces.slice(0, 200).map(t => (
          <div key={t.id} className="grid grid-cols-[60px_50px_1fr_60px_60px_140px] gap-2 px-4 py-1.5 text-xs border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[t.traceType] || 'bg-zinc-400'}`} />
              <span className="text-[10px]">{t.traceType}</span>
            </span>
            <span className="font-mono text-[10px]">{t.method || '—'}</span>
            <span className="truncate font-mono text-[10px]">{t.path || '—'}</span>
            <span className={`font-mono text-[10px] ${statusColor(t.status)}`}>{t.status || '—'}</span>
            <span className={`font-mono text-[10px] ${latencyColor(t.durationMs)}`}>{t.durationMs != null ? `${t.durationMs}ms` : '—'}</span>
            <span className="text-[10px] text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[9px] text-[var(--muted-foreground)]">{sub}</p>}
    </div>
  )
}
