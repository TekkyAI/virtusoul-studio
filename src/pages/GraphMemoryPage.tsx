import { useState, useEffect, useCallback, useRef } from 'react'
import { Brain, RefreshCw, Download, Trash2, Search, X } from 'lucide-react'

type MemNode = {
  id: string; content: string; memoryType: string
  importance: number; sourceFile?: string; createdAt: string
}
type MemEdge = { id: string; fromId: string; toId: string; relation: string }
type Stats = { byType: { memoryType: string; count: number; avgImportance: number }[]; totalNodes: number; totalEdges: number }

const TYPE_COLORS: Record<string, string> = {
  Fact: '#60a5fa', Preference: '#f472b6', Decision: '#fbbf24',
  Identity: '#a78bfa', Event: '#34d399', Observation: '#fb923c',
  Goal: '#e879f9', Todo: '#38bdf8',
}
const EDGE_COLORS: Record<string, string> = {
  RelatedTo: '#555', Updates: '#60a5fa', Contradicts: '#ef4444', CausedBy: '#fbbf24', PartOf: '#a78bfa',
}

export default function GraphMemoryPage() {
  const [nodes, setNodes] = useState<MemNode[]>([])
  const [edges, setEdges] = useState<MemEdge[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<MemNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map())
  const animRef = useRef<number>(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [g, s] = await Promise.all([
      fetch('/api/memory/graph').then(r => r.json()).catch(() => ({ nodes: [], edges: [] })),
      fetch('/api/memory/stats').then(r => r.json()).catch(() => null),
    ])
    setNodes(g.nodes || [])
    setEdges(g.edges || [])
    setStats(s)
    posRef.current = new Map()
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    await fetch('/api/memory/sync', { method: 'POST' })
    await load()
    setSyncing(false)
  }

  const clearAll = async () => {
    if (!confirm('Delete all memory nodes and edges?')) return
    await fetch('/api/memory/nodes', { method: 'DELETE' })
    load()
  }

  // Force-directed graph simulation on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    let cancelled = false

    const startSim = () => {
      if (cancelled) return
      const rect = canvas.getBoundingClientRect()
      const W = rect.width, H = rect.height
      if (W < 10 || H < 10) { setTimeout(startSim, 100); return }

      const ctx = canvas.getContext('2d')!
      canvas.width = W * 2; canvas.height = H * 2
      ctx.scale(2, 2)

      const pos = posRef.current
      for (const n of nodes) {
        if (!pos.has(n.id)) {
          pos.set(n.id, { x: W / 2 + (Math.random() - 0.5) * W * 0.6, y: H / 2 + (Math.random() - 0.5) * H * 0.6, vx: 0, vy: 0 })
        }
      }

      const filteredNodes = filter ? nodes.filter(n => n.memoryType === filter) : nodes
      const filteredIds = new Set(filteredNodes.map(n => n.id))
      const filteredEdges = edges.filter(e => filteredIds.has(e.fromId) && filteredIds.has(e.toId))

      let frame = 0
      const tick = () => {
        if (cancelled) return
        ctx.clearRect(0, 0, W, H)

        for (const a of filteredNodes) {
          const pa = pos.get(a.id)!
          pa.vx += (W / 2 - pa.x) * 0.001
          pa.vy += (H / 2 - pa.y) * 0.001
          for (const b of filteredNodes) {
            if (a.id === b.id) continue
            const pb = pos.get(b.id)!
            const dx = pa.x - pb.x, dy = pa.y - pb.y
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
            const force = 800 / (dist * dist)
            pa.vx += (dx / dist) * force
            pa.vy += (dy / dist) * force
          }
        }
        for (const e of filteredEdges) {
          const pa = pos.get(e.fromId), pb = pos.get(e.toId)
          if (!pa || !pb) continue
          const dx = pb.x - pa.x, dy = pb.y - pa.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const force = (dist - 80) * 0.005
          pa.vx += (dx / dist) * force; pa.vy += (dy / dist) * force
          pb.vx -= (dx / dist) * force; pb.vy -= (dy / dist) * force
        }
        for (const n of filteredNodes) {
          const p = pos.get(n.id)!
          p.vx *= 0.85; p.vy *= 0.85
          p.x += p.vx; p.y += p.vy
          p.x = Math.max(20, Math.min(W - 20, p.x))
          p.y = Math.max(20, Math.min(H - 20, p.y))
        }

        for (const e of filteredEdges) {
          const pa = pos.get(e.fromId), pb = pos.get(e.toId)
          if (!pa || !pb) continue
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y)
          ctx.strokeStyle = EDGE_COLORS[e.relation] || '#333'
          ctx.lineWidth = 0.5; ctx.globalAlpha = 0.4
          ctx.stroke(); ctx.globalAlpha = 1
        }

        for (const n of filteredNodes) {
          const p = pos.get(n.id)!
          const r = 6 + n.importance * 1.2
          const isSelected = selected?.id === n.id
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fillStyle = TYPE_COLORS[n.memoryType] || '#888'
          ctx.globalAlpha = isSelected ? 1 : 0.8
          ctx.fill()
          if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke() }
          ctx.globalAlpha = 1

          if (filteredNodes.length < 50) {
            ctx.font = '9px sans-serif'
            ctx.fillStyle = '#aaa'
            ctx.fillText(n.content.slice(0, 30), p.x + r + 3, p.y + 3)
          }
        }

        frame++
        if (frame < 300) animRef.current = requestAnimationFrame(tick)
      }
      animRef.current = requestAnimationFrame(tick)
    }

    // Delay to ensure DOM layout is complete
    requestAnimationFrame(() => startSim())

    return () => { cancelled = true; cancelAnimationFrame(animRef.current) }
  }, [nodes, edges, filter, selected])

  // Click handler for canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    const filteredNodes = filter ? nodes.filter(n => n.memoryType === filter) : nodes
    for (const n of filteredNodes) {
      const p = posRef.current.get(n.id)
      if (!p) continue
      const dx = p.x - x, dy = p.y - y
      if (dx * dx + dy * dy < 200) { setSelected(n); return }
    }
    setSelected(null)
  }

  const searchResults = search
    ? nodes.filter(n => n.content.toLowerCase().includes(search.toLowerCase()))
    : []

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">Graph Memory</h1>
          {stats && <span className="text-xs text-[var(--muted-foreground)]">{stats.totalNodes} nodes · {stats.totalEdges} edges</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={sync} disabled={syncing} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
            <Download size={12} className={`inline mr-1 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Syncing…' : 'Sync'}
          </button>
          <button onClick={clearAll} className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"><Trash2 size={14} /></button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Type filters + search */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-[var(--border)]">
        <button onClick={() => setFilter('')} className={`px-2 py-1 text-[10px] rounded-lg ${!filter ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>All</button>
        {Object.keys(TYPE_COLORS).map(t => (
          <button key={t} onClick={() => setFilter(f => f === t ? '' : t)}
            className={`px-2 py-1 text-[10px] rounded-lg flex items-center gap-1 ${filter === t ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
            <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t] }} />{t}
            {stats && <span className="opacity-50">({stats.byType.find(s => s.memoryType === t)?.count ?? 0})</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Search size={12} className="text-[var(--muted-foreground)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories…"
            className="px-2 py-1 text-xs bg-transparent border-b border-[var(--border)] w-40 focus:outline-none" />
        </div>
      </div>

      {/* Main area: graph + detail panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Graph canvas */}
          <div className="flex-1 relative bg-[var(--background)]" style={{ minHeight: '300px' }}>
            <canvas ref={canvasRef} onClick={handleCanvasClick} className="absolute inset-0 w-full h-full cursor-crosshair" />
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Brain size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm text-[var(--muted-foreground)]">No memories yet</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Click Sync to ingest from OpenClaw workspace</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {Object.entries(EDGE_COLORS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1 text-[9px] text-[var(--muted-foreground)]">
                  <span className="w-4 h-0.5 rounded" style={{ background: v }} />{k}
                </span>
              ))}
            </div>
          </div>

        {/* Detail / search panel */}
        {(selected || search) && (
          <div className="w-72 border-l border-[var(--border)] bg-[var(--card)] overflow-y-auto p-4">
            {selected && !search && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[selected.memoryType] }} />
                    <span className="text-xs font-bold">{selected.memoryType}</span>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-[var(--muted)]"><X size={12} /></button>
                </div>
                <p className="text-xs leading-relaxed mb-3">{selected.content}</p>
                <div className="space-y-1 text-[10px] text-[var(--muted-foreground)]">
                  <p>Importance: {'⭐'.repeat(Math.min(selected.importance, 10))}</p>
                  {selected.sourceFile && <p>Source: {selected.sourceFile}</p>}
                  <p>Created: {new Date(selected.createdAt).toLocaleDateString()}</p>
                </div>
                {/* Connected edges */}
                <div className="mt-3">
                  <p className="text-[10px] font-medium mb-1">Connections</p>
                  {edges.filter(e => e.fromId === selected.id || e.toId === selected.id).map(e => {
                    const otherId = e.fromId === selected.id ? e.toId : e.fromId
                    const other = nodes.find(n => n.id === otherId)
                    return other ? (
                      <div key={e.id} className="flex items-center gap-1 text-[10px] py-0.5 cursor-pointer hover:text-[var(--foreground)]"
                        onClick={() => setSelected(other)}>
                        <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[other.memoryType] }} />
                        <span className="text-[var(--muted-foreground)]">{e.relation}→</span>
                        <span className="truncate">{other.content.slice(0, 40)}</span>
                      </div>
                    ) : null
                  })}
                </div>
              </>
            )}
            {search && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold">Search: "{search}"</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{searchResults.length} results</span>
                </div>
                {searchResults.slice(0, 50).map(n => (
                  <div key={n.id} className="py-2 border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--muted)] -mx-4 px-4"
                    onClick={() => { setSelected(n); setSearch('') }}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[n.memoryType] }} />
                      <span className="text-[10px] font-medium">{n.memoryType}</span>
                    </div>
                    <p className="text-[10px] line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        </div>

        {/* Node list (always visible below graph) */}
        {nodes.length > 0 && (
          <div className="border-t border-[var(--border)] max-h-48 overflow-y-auto px-6 py-2">
            <p className="text-[10px] text-[var(--muted-foreground)] mb-1">{nodes.length} memories</p>
            <div className="flex flex-wrap gap-2">
              {(filter ? nodes.filter(n => n.memoryType === filter) : nodes).map(n => (
                <div key={n.id} onClick={() => setSelected(n)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer border ${selected?.id === n.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:bg-[var(--muted)]'}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[n.memoryType] }} />
                  <span className="truncate max-w-[200px]">{n.content.slice(0, 60)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
