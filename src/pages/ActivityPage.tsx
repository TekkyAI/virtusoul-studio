import { useState, useEffect, useCallback } from 'react'
import { Activity, Bot, MessageSquare, Clock, RefreshCw } from 'lucide-react'

type EventType = 'all' | 'agent' | 'chat' | 'cron' | 'system'

interface SessionEvent {
  key: string
  label: string
  agentId?: string
  messageCount?: number
  totalTokens?: number
  updatedAt?: number
  kind?: string
}

const typeIcon = { agent: Bot, chat: MessageSquare, cron: Clock, system: Activity }
const typeColor: Record<string, string> = { agent: 'text-blue-400', chat: 'text-emerald-400', cron: 'text-amber-400', system: 'text-purple-400' }

function inferType(s: SessionEvent): string {
  if (s.kind === 'cron') return 'cron'
  if (s.key?.includes('cron')) return 'cron'
  if (s.agentId) return 'agent'
  return 'chat'
}

export default function ActivityPage() {
  const [sessions, setSessions] = useState<SessionEvent[]>([])
  const [filter, setFilter] = useState<EventType>('all')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sessions')
      const data = await res.json()
      setSessions((data.sessions ?? []).sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)))
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i) }, [load])

  const filtered = filter === 'all' ? sessions : sessions.filter(s => inferType(s) === filter)
  const filters: EventType[] = ['all', 'agent', 'chat', 'cron', 'system']

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity size={22} className="text-[var(--primary)]" /> Activity Timeline
        </h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}
          >{f}</button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.length === 0 && <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">No activity</p>}
        {filtered.map(s => {
          const type = inferType(s)
          const Icon = typeIcon[type as keyof typeof typeIcon] || Activity
          return (
            <div key={s.key} className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors">
              <Icon size={16} className={`mt-0.5 ${typeColor[type] || ''}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{s.label || s.key}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${typeColor[type]} bg-current/10`}>{type}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {s.updatedAt && <span>{new Date(s.updatedAt).toLocaleString()}</span>}
                  {s.messageCount != null && <span>{s.messageCount} msgs</span>}
                  {s.totalTokens != null && <span>{s.totalTokens.toLocaleString()} tokens</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
