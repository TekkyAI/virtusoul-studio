import { useState, useEffect } from 'react'
import { Bot, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Agent { id: string; name?: string; model?: string }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/admin/agents/${selected}/prompt`)
      .then(r => r.json())
      .then(d => setPrompt(d.content ?? d.prompt ?? ''))
      .catch(() => setPrompt('(Could not load prompt)'))
  }, [selected])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/agents/${selected}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prompt }),
    }).catch(() => {})
    setSaving(false)
  }

  return (
    <div className="flex h-full">
      {/* Agent list */}
      <div className="w-56 border-r border-[var(--border)] overflow-y-auto py-3 px-2">
        <p className="px-2 mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Agents</p>
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors text-left',
              selected === a.id ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            )}
          >
            <Bot size={16} />
            <span className="truncate">{a.name ?? a.id}</span>
          </button>
        ))}
        {agents.length === 0 && <p className="px-2 text-xs text-[var(--muted-foreground)]">No agents found</p>}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[var(--muted-foreground)]" />
                <span className="text-sm font-medium">SOUL.md — {selected}</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 p-6 bg-transparent text-sm font-mono text-[var(--foreground)] resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-[var(--muted-foreground)]">
            Select an agent to edit
          </div>
        )}
      </div>
    </div>
  )
}
