import { useState, useEffect, useCallback } from 'react'
import { Cpu, Star, RefreshCw, Search } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

type Model = { key: string; name: string; input: string; contextWindow: number; available: boolean; tags: string[]; local: boolean }

export default function ModelManagerPage() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const { run, exec, running, output, setOutput } = useCliExec()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await run('models list')
      setModels(r.data?.models ?? [])
    } catch {} finally { setLoading(false) }
  }, [run])

  useEffect(() => { load() }, [load])

  const setDefault = async (key: string) => {
    setOutput('')
    await exec(`models set ${key}`, { onDone: () => load() })
  }

  const scan = () => { setOutput(''); exec('models scan', { onDone: () => load() }) }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2"><Cpu size={22} className="text-[var(--primary)]" /> Models</h1>
        <div className="flex gap-2">
          <button onClick={scan} disabled={running} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">
            <Search size={12} /> Scan
          </button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--muted)]"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {output && <pre className="text-xs bg-[var(--muted)] rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap">{output}</pre>}

      <div className="space-y-2">
        {models.map(m => (
          <div key={m.key} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{m.name}</span>
                {m.tags.includes('default') && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)]">default</span>}
                {m.local && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/20 text-blue-400">local</span>}
                {!m.available && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/20 text-red-400">unavailable</span>}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-mono">{m.key}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{m.input} • {(m.contextWindow / 1000).toFixed(0)}K context</p>
            </div>
            {!m.tags.includes('default') && (
              <button onClick={() => setDefault(m.key)} disabled={running}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[var(--muted)]">
                <Star size={12} /> Set Default
              </button>
            )}
          </div>
        ))}
        {models.length === 0 && !loading && <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No models configured. Try scanning.</p>}
      </div>
    </div>
  )
}
