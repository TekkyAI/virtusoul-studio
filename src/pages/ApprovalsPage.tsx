import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, Check, X, Clock, RefreshCw, Terminal } from 'lucide-react'

interface Approval {
  id: string
  request: { command: string; cwd?: string; security?: string; ask?: string; agentId?: string; sessionKey?: string }
  createdAtMs: number
  expiresAtMs: number
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/approvals')
      const data = await res.json()
      setPending(data.pending ?? data.approvals ?? [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 5000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const resolve = async (id: string, decision: 'allow-once' | 'allow-always' | 'deny') => {
    setProcessingId(id)
    try {
      await fetch(`/api/admin/approvals/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      setPending(prev => prev.filter(a => a.id !== id))
    } catch {} finally { setProcessingId(null) }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert size={22} className="text-[var(--primary)]" /> Exec Approvals
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Approve or reject tool calls before they execute</p>
        </div>
        <button onClick={fetchPending} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          <ShieldAlert size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No pending approvals</p>
          <p className="text-xs mt-1">Approvals appear here when the agent needs to run commands</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(a => {
            const remaining = Math.max(0, Math.round((a.expiresAtMs - Date.now()) / 1000))
            return (
              <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Terminal size={14} />
                    <code className="bg-[var(--muted)] px-2 py-0.5 rounded text-xs">{a.request.command}</code>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock size={12} /> {remaining}s
                  </div>
                </div>
                {a.request.cwd && <p className="text-xs text-[var(--muted-foreground)]">cwd: {a.request.cwd}</p>}
                {a.request.ask && <p className="text-xs text-[var(--muted-foreground)]">"{a.request.ask}"</p>}
                {a.request.security && (
                  <p className="text-xs text-amber-400">⚠ {a.request.security}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(a.id, 'allow-once')}
                    disabled={processingId === a.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    <Check size={12} /> Allow Once
                  </button>
                  <button
                    onClick={() => resolve(a.id, 'allow-always')}
                    disabled={processingId === a.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-black text-xs font-medium"
                  >
                    <Check size={12} /> Always Allow
                  </button>
                  <button
                    onClick={() => resolve(a.id, 'deny')}
                    disabled={processingId === a.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
                  >
                    <X size={12} /> Deny
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
