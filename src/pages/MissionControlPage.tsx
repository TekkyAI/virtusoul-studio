import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield, Wifi, Radio, Users, Bot, Play, Square, RotateCw, ArrowUpCircle, X } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

type SystemState = 'STABLE' | 'DRIFTING' | 'ALERT'
const stateColors: Record<SystemState, string> = { STABLE: 'text-emerald-400', DRIFTING: 'text-amber-400', ALERT: 'text-red-400' }
const stateBg: Record<SystemState, string> = { STABLE: 'bg-emerald-400/10 border-emerald-400/30', DRIFTING: 'bg-amber-400/10 border-amber-400/30', ALERT: 'bg-red-400/10 border-red-400/30' }

export default function MissionControlPage() {
  const [gwStatus, setGwStatus] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [version, setVersion] = useState<{ current: string; latest: string } | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateOutput, setUpdateOutput] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const { exec, running, output, setOutput } = useCliExec()

  useEffect(() => {
    const load = () => {
      fetch('/api/gateway/status').then(r => r.json()).then(setGwStatus).catch(() => {})
      fetch('/api/admin/health').then(r => r.json()).then(setHealth).catch(() => {})
    }
    load()
    const i = setInterval(load, 10000)
    return () => clearInterval(i)
  }, [])

  // Version from backend cache
  useEffect(() => {
    fetch('/api/admin/version').then(r => r.json()).then(d => {
      if (d.current || d.latest) setVersion({ current: d.current, latest: d.latest })
    }).catch(() => {})
  }, [])

  // Connect to update stream (for modal)
  const logRef = useRef<HTMLPreElement>(null)
  const connectStream = useCallback(() => {
    fetch('/api/admin/update').then(async res => {
      const reader = res.body?.getReader(); if (!reader) return
      const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('event: ')) continue
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.status) setUpdateStatus(d.status)
            if (d.text) {
              setUpdateOutput(p => p + d.text)
              requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight })
            }
          } catch {}
        }
      }
    }).catch(() => {})
  }, [])

  // Check if update is already running on mount
  useEffect(() => {
    fetch('/api/admin/update').then(async res => {
      const reader = res.body?.getReader(); if (!reader) return
      const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.status === 'running') { setShowUpdateModal(true); setUpdateStatus('running') }
            if (d.status && d.status !== 'idle') setUpdateStatus(d.status)
            if (d.text) setUpdateOutput(p => p + d.text)
          } catch {}
        }
      }
      requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight })
    }).catch(() => {})
  }, [])

  const connected = gwStatus?.status === 'connected'
  const healthOk = health?.ok !== false && !health?.error
  const state: SystemState = connected && healthOk ? 'STABLE' : connected || healthOk ? 'DRIFTING' : 'ALERT'

  const channels = health?.channels ? Object.entries(health.channels) : []
  const uptime = gwStatus?.uptime ? Math.round(gwStatus.uptime / 1000) : 0
  const uptimeStr = uptime > 3600 ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : uptime > 60 ? `${Math.floor(uptime / 60)}m` : `${uptime}s`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Shield size={22} className="text-[var(--primary)]" /> Mission Control
      </h1>

      <div className={`rounded-xl border p-6 text-center ${stateBg[state]}`}>
        <p className={`text-4xl font-bold tracking-wider ${stateColors[state]}`}>{state}</p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">System Status</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Wifi} label="Gateway" value={connected ? 'Connected' : 'Disconnected'} sub={connected ? `Uptime: ${uptimeStr}` : undefined} ok={connected} />
        <Card icon={Radio} label="Channels" value={`${channels.length}`} sub={`${channels.filter(([, v]: any) => v.running).length} active`} ok={channels.some(([, v]: any) => v.running)} />
        <Card icon={Users} label="Sessions" value={health?.sessions?.count?.toString() ?? '—'} ok />
        <Card icon={Bot} label="Agent" value={health?.agentId ?? 'main'} ok />
      </div>

      {channels.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
          <h2 className="text-sm font-medium mb-3">Channels</h2>
          {channels.map(([name, info]: any) => (
            <div key={name} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${info.running ? 'bg-emerald-400' : info.configured ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                <span className="text-sm capitalize">{name}</span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">{info.running ? 'Running' : info.configured ? 'Configured' : 'Off'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gateway Control */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <h2 className="text-sm font-medium">Gateway Control</h2>
        <div className="flex gap-2">
          <button onClick={() => { setOutput(''); exec('gateway start') }} disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50">
            <Play size={12} /> Start
          </button>
          <button onClick={() => { setOutput(''); exec('gateway stop') }} disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50">
            <Square size={12} /> Stop
          </button>
          <button onClick={() => { setOutput(''); exec('gateway restart') }} disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs disabled:opacity-50">
            <RotateCw size={12} /> Restart
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted-foreground)]">⚠ Stop/Restart will temporarily disconnect the dashboard. Auto-reconnect will restore the connection.</p>
        {output && <pre className="text-xs bg-[var(--muted)] rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap">{output}</pre>}
      </div>

      {/* OpenClaw Update */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2"><ArrowUpCircle size={16} /> OpenClaw Update</h2>
          {version?.current && <span className="text-xs text-[var(--muted-foreground)]">v{version.current}</span>}
        </div>
        {version?.latest && version.current && version.latest !== version.current ? (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm">Update available: <span className="text-[var(--primary)] font-medium">v{version.latest}</span></p>
              <p className="text-xs text-[var(--muted-foreground)]">Current: v{version.current}</p>
            </div>
            <button
              onClick={() => {
                setUpdateOutput(''); setUpdateStatus('idle'); setShowUpdateModal(true)
                fetch('/api/admin/update', { method: 'POST' }).then(r => r.json()).then(d => {
                  if (d.ok || d.error === 'Update already in progress') connectStream()
                  else setUpdateOutput(`Error: ${d.error}\n`)
                }).catch(e => setUpdateOutput(`Error: ${e.message}\n`))
              }}
              disabled={updateStatus === 'running'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 disabled:opacity-50">
              <ArrowUpCircle size={14} /> {updateStatus === 'running' ? 'Updating…' : 'Update Now'}
            </button>
          </div>
        ) : version?.current ? (
          <p className="text-sm text-emerald-400">✓ Up to date{version.latest ? ` (v${version.latest})` : ''}</p>
        ) : (
          <p className="text-xs text-[var(--muted-foreground)]">Checking for updates…</p>
        )}
      </div>

      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={16} className={updateStatus === 'running' ? 'text-amber-400 animate-spin' : updateStatus === 'done' ? 'text-emerald-400' : updateStatus === 'error' ? 'text-red-400' : 'text-[var(--muted-foreground)]'} />
                <span className="text-sm font-semibold">
                  {updateStatus === 'running' ? 'Updating OpenClaw…' : updateStatus === 'done' ? 'Update Complete' : updateStatus === 'error' ? 'Update Failed' : 'OpenClaw Update'}
                </span>
              </div>
              {updateStatus !== 'running' && (
                <button onClick={() => setShowUpdateModal(false)} className="p-1 rounded-md hover:bg-[var(--muted)]"><X size={16} /></button>
              )}
            </div>
            <pre ref={logRef} className="p-4 h-80 overflow-auto text-xs font-mono leading-relaxed whitespace-pre-wrap text-[var(--foreground)]">
              {updateOutput || 'Starting update…\n'}
            </pre>
            <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
              {updateStatus === 'running' ? (
                <p className="text-xs text-emerald-400">✓ Safe to close this page — update runs in the background</p>
              ) : updateStatus === 'done' ? (
                <p className="text-xs text-emerald-400">✓ Gateway will restart automatically. Dashboard will reconnect.</p>
              ) : updateStatus === 'error' ? (
                <p className="text-xs text-red-400">Check the output above for details.</p>
              ) : (
                <span />
              )}
              {updateStatus !== 'running' && (
                <button onClick={() => setShowUpdateModal(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">Close</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ icon: Icon, label, value, sub, ok }: { icon: any; label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={ok ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'} />
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
    </div>
  )
}
