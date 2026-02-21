import { useState, useEffect } from 'react'
import { SlidersHorizontal, Save, Shield, Search, Clock, Database } from 'lucide-react'

interface MemorySettings {
  compaction: any
  contextPruning: any
  memorySearch: any
}

const DEFAULTS = {
  compaction: {
    mode: 'safeguard', reserveTokensFloor: 20000,
    memoryFlush: { enabled: true, softThresholdTokens: 40000, systemPrompt: 'Session nearing compaction. Store durable memories now.', prompt: 'Write any lasting notes to memory/YYYY-MM-DD.md — focus on decisions, state changes, lessons, and blockers. Reply with NO_REPLY if nothing to store.' },
  },
  contextPruning: { mode: 'cache-ttl', ttl: '6h', keepLastAssistants: 3 },
  memorySearch: { query: { hybrid: { enabled: true, vectorWeight: 0.7, textWeight: 0.3 } }, experimental: { sessionMemory: true }, sources: ['memory', 'sessions'] },
}

export default function MemoryTuningPage() {
  const [settings, setSettings] = useState<MemorySettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/memory-settings').then(r => r.json()).then(setSettings).catch(() => {})
  }, [])

  const save = async (patch: Partial<MemorySettings>) => {
    setSaving(true); setMsg(null)
    const next = { ...settings!, ...patch }
    setSettings(next)
    try {
      const res = await fetch('/api/admin/memory-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      if (res.ok) { setMsg({ type: 'ok', text: 'Saved. Restart gateway for changes to take effect.' }); setTimeout(() => setMsg(null), 4000) }
      else { const d = await res.json(); setMsg({ type: 'err', text: d.error ?? 'Save failed' }) }
    } catch (e: any) { setMsg({ type: 'err', text: e.message }) }
    finally { setSaving(false) }
  }

  if (!settings) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>

  const flush = settings.compaction?.memoryFlush
  const flushEnabled = flush?.enabled === true
  const pruning = settings.contextPruning
  const pruningEnabled = pruning?.mode === 'cache-ttl'
  const hybrid = settings.memorySearch?.query?.hybrid
  const hybridEnabled = hybrid?.enabled === true
  const sessionIdx = settings.memorySearch?.experimental?.sessionMemory === true

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[var(--primary)]" />
          <span className="text-sm font-semibold">Memory Tuning</span>
        </div>
        {msg && <p className={`text-xs px-3 py-1.5 rounded-lg ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{msg.text}</p>}
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">Configure how your agent remembers information across sessions. These settings prevent memory loss during long conversations.</p>

      {/* Fix 1: Memory Flush */}
      <Card icon={Shield} title="Memory Flush" desc="Saves important context before compaction wipes the conversation. This is the single most impactful setting." enabled={flushEnabled}
        onToggle={() => {
          const next = flushEnabled
            ? { ...settings.compaction, memoryFlush: { ...flush, enabled: false } }
            : { ...DEFAULTS.compaction }
          save({ compaction: next })
        }}>
        {flushEnabled && (
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            <Field label="Flush threshold (tokens)" value={flush?.softThresholdTokens ?? 40000}
              onChange={v => save({ compaction: { ...settings.compaction, memoryFlush: { ...flush, softThresholdTokens: Number(v) } } })} type="number" hint="Triggers flush when context reaches this size. 40,000 recommended." />
            <Field label="Reserve floor (tokens)" value={settings.compaction?.reserveTokensFloor ?? 20000}
              onChange={v => save({ compaction: { ...settings.compaction, reserveTokensFloor: Number(v) } })} type="number" hint="Minimum tokens kept after compaction." />
            <Field label="Flush prompt" value={flush?.prompt ?? ''} onChange={v => save({ compaction: { ...settings.compaction, memoryFlush: { ...flush, prompt: v } } })} type="textarea" hint="What the agent saves. Customize for your workflow." />
          </div>
        )}
      </Card>

      {/* Fix 2: Context Pruning */}
      <Card icon={Clock} title="Context Pruning" desc="Gradually cleans up old tool outputs instead of one big compaction wipe. Only trims tool results, never your messages." enabled={pruningEnabled}
        onToggle={() => {
          save({ contextPruning: pruningEnabled ? {} : DEFAULTS.contextPruning })
        }}>
        {pruningEnabled && (
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            <Field label="TTL" value={pruning?.ttl ?? '6h'} onChange={v => save({ contextPruning: { ...pruning, ttl: v } })} hint="How long tool outputs stay. e.g. 6h, 12h, 1d" />
            <Field label="Keep last N assistant messages" value={pruning?.keepLastAssistants ?? 3}
              onChange={v => save({ contextPruning: { ...pruning, keepLastAssistants: Number(v) } })} type="number" hint="Recent assistant messages always kept." />
          </div>
        )}
      </Card>

      {/* Fix 3: Hybrid Search */}
      <Card icon={Search} title="Hybrid Search" desc="Combines conceptual + keyword matching for memory lookups. Much better at finding specific names, codes, and terms." enabled={hybridEnabled}
        onToggle={() => {
          const ms = { ...settings.memorySearch }
          ms.query = hybridEnabled ? {} : DEFAULTS.memorySearch.query
          save({ memorySearch: ms })
        }}>
        {hybridEnabled && (
          <div className="space-y-3 pt-3 border-t border-[var(--border)]">
            <div className="flex gap-3">
              <Field label="Vector weight" value={hybrid?.vectorWeight ?? 0.7} onChange={v => {
                const ms = { ...settings.memorySearch, query: { hybrid: { ...hybrid, vectorWeight: Number(v) } } }
                save({ memorySearch: ms })
              }} type="number" hint="Conceptual matching (0-1)" />
              <Field label="Text weight" value={hybrid?.textWeight ?? 0.3} onChange={v => {
                const ms = { ...settings.memorySearch, query: { hybrid: { ...hybrid, textWeight: Number(v) } } }
                save({ memorySearch: ms })
              }} type="number" hint="Keyword matching (0-1)" />
            </div>
          </div>
        )}
      </Card>

      {/* Fix 4: Session Indexing */}
      <Card icon={Database} title="Session Indexing" desc="Makes past conversations searchable. Without this, your agent can only search memory files — not what you actually discussed." enabled={sessionIdx}
        onToggle={() => {
          const ms = { ...settings.memorySearch }
          if (sessionIdx) {
            ms.experimental = { ...ms.experimental, sessionMemory: false }
            ms.sources = (ms.sources ?? []).filter((s: string) => s !== 'sessions')
          } else {
            ms.experimental = { ...ms.experimental, sessionMemory: true }
            ms.sources = [...new Set([...(ms.sources ?? []), 'memory', 'sessions'])]
          }
          save({ memorySearch: ms })
        }} />

      <p className="text-[10px] text-[var(--muted-foreground)]">Changes are saved to ~/.openclaw/openclaw.json. Restart the gateway for changes to take full effect.</p>
    </div>
  )
}

function Card({ icon: Icon, title, desc, enabled, onToggle, children }: { icon: any; title: string; desc: string; enabled: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon size={16} className={`mt-0.5 ${enabled ? 'text-emerald-400' : 'text-[var(--muted-foreground)]'}`} />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{desc}</p>
          </div>
        </div>
        <button onClick={onToggle} className={`shrink-0 w-10 h-5 rounded-full transition-colors relative ${enabled ? 'bg-emerald-500' : 'bg-zinc-600'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', hint }: { label: string; value: any; onChange: (v: string) => void; type?: string; hint?: string }) {
  const [local, setLocal] = useState(String(value))
  useEffect(() => setLocal(String(value)), [value])

  const commit = () => { if (local !== String(value)) onChange(local) }

  if (type === 'textarea') {
    return (
      <div className="space-y-1">
        <label className="text-[11px] text-[var(--muted-foreground)]">{label}</label>
        <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={commit} rows={2}
          className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
        {hint && <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1 flex-1">
      <label className="text-[11px] text-[var(--muted-foreground)]">{label}</label>
      <input type={type} value={local} onChange={e => setLocal(e.target.value)} onBlur={commit}
        className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
      {hint && <p className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  )
}
