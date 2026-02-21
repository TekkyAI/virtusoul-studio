import { useState, useEffect, useCallback } from 'react'
import { Anchor, RefreshCw, Power, Info, Download, X } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

type Hook = {
  name: string; description: string; emoji: string
  eligible: boolean; disabled: boolean; source: string
  events: string[]; homepage?: string
  managedByPlugin: boolean
}

export default function HooksManagerPage() {
  const { run } = useCliExec()
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Hook | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [installSpec, setInstallSpec] = useState('')
  const [showInstall, setShowInstall] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await run('hooks list')
    setHooks(r?.hooks ?? [])
    setLoading(false)
  }, [run])

  useEffect(() => { load() }, [load])

  const toggle = async (h: Hook) => {
    await run(`hooks ${h.disabled ? 'enable' : 'disable'} ${h.name}`)
    load()
  }

  const showInfo = async (h: Hook) => {
    setSelected(h)
    const r = await run(`hooks info ${h.name}`)
    setDetail(r)
  }

  const install = async () => {
    if (!installSpec.trim()) return
    await run(`hooks install ${installSpec.trim()}`)
    setInstallSpec('')
    setShowInstall(false)
    load()
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Anchor size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">Hooks</h1>
          <span className="text-xs text-[var(--muted-foreground)]">{hooks.length} hooks</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInstall(s => !s)} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
            <Download size={12} className="inline mr-1" />Install
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showInstall && (
        <div className="mb-4 flex gap-2">
          <input value={installSpec} onChange={e => setInstallSpec(e.target.value)} placeholder="npm package, path, or archive..."
            className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--muted)] border border-[var(--border)]"
            onKeyDown={e => e.key === 'Enter' && install()} />
          <button onClick={install} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">Install</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {hooks.map(h => (
          <div key={h.name} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-lg">{h.emoji || '🪝'}</span>
              <button onClick={() => toggle(h)} title={h.disabled ? 'Enable' : 'Disable'}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${h.disabled ? 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]' : 'text-emerald-400 hover:bg-emerald-400/10'}`}>
                <Power size={14} />
              </button>
            </div>
            <p className="text-sm font-medium truncate">{h.name}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2">{h.description}</p>
            <div className="flex flex-wrap gap-1 mt-auto">
              {h.events.map(e => (
                <span key={e} className="px-1.5 py-0.5 text-[9px] rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{e}</span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-[var(--muted-foreground)]">{h.source}</span>
              <button onClick={() => showInfo(h)} className="p-1 rounded hover:bg-[var(--muted)]">
                <Info size={12} className="text-[var(--muted-foreground)]" />
              </button>
            </div>
            {!h.eligible && <span className="text-[9px] text-amber-400">⚠ Missing requirements</span>}
          </div>
        ))}
      </div>

      {selected && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">{detail.emoji} {detail.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-[var(--muted)]"><X size={14} /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">{detail.description}</p>
            <div className="space-y-2 text-xs">
              <div><span className="text-[var(--muted-foreground)]">Source:</span> {detail.source}</div>
              <div><span className="text-[var(--muted-foreground)]">Events:</span> {detail.events?.join(', ')}</div>
              <div><span className="text-[var(--muted-foreground)]">Eligible:</span> {detail.eligible ? '✅' : '❌'}</div>
              <div><span className="text-[var(--muted-foreground)]">Enabled:</span> {detail.disabled ? '❌' : '✅'}</div>
              {detail.homepage && <div><span className="text-[var(--muted-foreground)]">Docs:</span> <a href={detail.homepage} target="_blank" className="text-[var(--primary)] underline">{detail.homepage}</a></div>}
              {detail.filePath && <div><span className="text-[var(--muted-foreground)]">Path:</span> <code className="text-[10px]">{detail.filePath}</code></div>}
              {detail.requirements?.bins?.length > 0 && <div><span className="text-[var(--muted-foreground)]">Required bins:</span> {detail.requirements.bins.join(', ')}</div>}
              {detail.requirements?.env?.length > 0 && <div><span className="text-[var(--muted-foreground)]">Required env:</span> {detail.requirements.env.join(', ')}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
