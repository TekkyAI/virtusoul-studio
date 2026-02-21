import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GatewaySession } from '@/hooks/useChat'

interface SessionSidebarProps {
  sessions: GatewaySession[]
  activeSession: string
  onSelect: (key: string) => void
  onNew: () => void
  onDelete?: (key: string) => void
}

function formatSessionLabel(s: GatewaySession): string {
  if (s.lastMessagePreview) return s.lastMessagePreview.slice(0, 40)
  if (s.label && s.label !== s.key) return s.label
  // Extract readable name from key like "agent:main:abc123"
  const parts = s.key.split(':')
  return parts.length >= 3 ? `Chat ${parts[2].slice(0, 6)}` : s.key
}

function groupByDate(sessions: GatewaySession[]) {
  const now = Date.now()
  const day = 86400000
  const groups: { label: string; items: GatewaySession[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Older', items: [] },
  ]

  const sorted = [...sessions].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  for (const s of sorted) {
    const age = now - (s.updatedAt ?? 0)
    if (age < day) groups[0].items.push(s)
    else if (age < 2 * day) groups[1].items.push(s)
    else if (age < 7 * day) groups[2].items.push(s)
    else groups[3].items.push(s)
  }

  return groups.filter(g => g.items.length > 0)
}

export function SessionSidebar({ sessions, activeSession, onSelect, onNew, onDelete }: SessionSidebarProps) {
  const groups = groupByDate(sessions)

  return (
    <div className="w-64 border-r border-[var(--border)] bg-[var(--background)] flex flex-col h-full">
      <div className="p-3 border-b border-[var(--border)]">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
        {groups.length === 0 && (
          <p className="px-2 py-4 text-xs text-[var(--muted-foreground)] text-center">No conversations yet</p>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((s) => (
                <div
                  key={s.key}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                    activeSession === s.key
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  )}
                  onClick={() => onSelect(s.key)}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-xs">{formatSessionLabel(s)}</span>
                  {s.totalTokens != null && (
                    <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">{(s.totalTokens / 1000).toFixed(0)}k</span>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s.key) }}
                      className="hidden group-hover:block p-0.5 rounded hover:bg-[var(--destructive)]/10 text-[var(--destructive)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
