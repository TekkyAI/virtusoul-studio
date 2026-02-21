import { useState, useEffect } from 'react'
import { MonitorDot, RefreshCw } from 'lucide-react'

interface Session { key?: string; sessionKey?: string; agentId?: string; channel?: string; totalTokens?: number; inputTokens?: number; outputTokens?: number; updatedAt?: string; isActive?: boolean }

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    fetch('/api/admin/sessions').then(r => r.json()).then(d => setSessions(d.sessions ?? [])).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { refresh(); const id = setInterval(refresh, 15000); return () => clearInterval(id) }, [])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Active Sessions</h2>
        <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Session</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Agent</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Channel</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/30">
                <td className="px-4 py-2.5 font-mono text-xs truncate max-w-48">{s.sessionKey ?? s.key ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs">{s.agentId ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs">{s.channel ?? 'webchat'}</td>
                <td className="px-4 py-2.5 text-xs text-right tabular-nums">{s.totalTokens?.toLocaleString() ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            <MonitorDot size={24} className="mx-auto mb-2 opacity-40" />
            No active sessions
          </div>
        )}
      </div>
    </div>
  )
}
