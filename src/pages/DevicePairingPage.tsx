import { useState, useEffect, useCallback } from 'react'
import { Smartphone, Check, X, Shield, RefreshCw } from 'lucide-react'

export default function DevicePairingPage() {
  const [pending, setPending] = useState<any[]>([])
  const [paired, setPaired] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/devices')
      const data = await res.json()
      setPending(data.pending ?? [])
      setPaired(data.paired ?? data.devices ?? [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i) }, [load])

  const action = async (id: string, type: 'approve' | 'reject') => {
    await fetch(`/api/admin/devices/${id}/${type}`, { method: 'POST' })
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Smartphone size={22} className="text-[var(--primary)]" /> Device Pairing
        </h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2"><Shield size={14} /> Pending Requests</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No pending requests</p>
        ) : pending.map((d: any) => (
          <div key={d.id || d.deviceId} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-mono">{(d.id || d.deviceId || '').slice(0, 16)}...</p>
              {d.createdAt && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{new Date(d.createdAt).toLocaleString()}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => action(d.id || d.deviceId, 'approve')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"><Check size={12} /> Approve</button>
              <button onClick={() => action(d.id || d.deviceId, 'reject')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs"><X size={12} /> Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2"><Smartphone size={14} /> Paired Devices</h2>
        {paired.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No paired devices</p>
        ) : paired.map((d: any, i: number) => (
          <div key={d.id || d.deviceId || i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-mono">{(d.id || d.deviceId || 'device').slice(0, 16)}...</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{d.clientId || d.client || 'Unknown client'}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">Paired</span>
          </div>
        ))}
      </div>
    </div>
  )
}
