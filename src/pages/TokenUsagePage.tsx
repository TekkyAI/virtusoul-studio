import { useState, useEffect } from 'react'
import { Coins, BarChart3 } from 'lucide-react'

interface Session { key: string; label: string; agentId?: string; messageCount?: number; totalTokens?: number; inputTokens?: number; outputTokens?: number; model?: string }

export default function TokenUsagePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/sessions').then(r => r.json()).then(d => {
      const list = (d.sessions ?? []).filter((s: any) => s.totalTokens > 0).sort((a: any, b: any) => (b.totalTokens ?? 0) - (a.totalTokens ?? 0))
      setSessions(list)
    }).finally(() => setLoading(false))
  }, [])

  const total = sessions.reduce((s, x) => s + (x.totalTokens ?? 0), 0)
  const totalInput = sessions.reduce((s, x) => s + (x.inputTokens ?? 0), 0)
  const totalOutput = sessions.reduce((s, x) => s + (x.outputTokens ?? 0), 0)
  const top5 = sessions.slice(0, 5)
  const maxTokens = top5[0]?.totalTokens ?? 1

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Coins size={22} className="text-[var(--primary)]" /> Token Usage
      </h1>

      <div className="grid grid-cols-3 gap-4">
        {[['Total', total], ['Input', totalInput], ['Output', totalOutput]].map(([label, val]) => (
          <div key={label as string} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
            <p className="text-2xl font-bold">{(val as number).toLocaleString()}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{label as string} Tokens</p>
          </div>
        ))}
      </div>

      {top5.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2"><BarChart3 size={14} /> Top Sessions</h2>
          {top5.map(s => (
            <div key={s.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate font-mono">{s.label || s.key}</span>
                <span className="text-[var(--muted-foreground)]">{(s.totalTokens ?? 0).toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded bg-[var(--muted)]">
                <div className="h-full rounded bg-[var(--primary)] transition-all" style={{ width: `${((s.totalTokens ?? 0) / maxTokens) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading...</p> : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs">
              <th className="text-left px-4 py-2">Session</th><th className="text-left px-4 py-2">Model</th>
              <th className="text-right px-4 py-2">Msgs</th><th className="text-right px-4 py-2">Input</th>
              <th className="text-right px-4 py-2">Output</th><th className="text-right px-4 py-2">Total</th>
            </tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.key} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]">{s.label || s.key}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">{s.model || '—'}</td>
                  <td className="px-4 py-2 text-right">{s.messageCount ?? 0}</td>
                  <td className="px-4 py-2 text-right">{(s.inputTokens ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{(s.outputTokens ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">{(s.totalTokens ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
