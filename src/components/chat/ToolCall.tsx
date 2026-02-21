import { useState } from 'react'
import { ChevronDown, Wrench, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageBlock } from '@/lib/types'

const statusIcon = {
  running: <Loader2 size={14} className="animate-spin text-[var(--primary)]" />,
  done: <Check size={14} className="text-green-500" />,
  error: <X size={14} className="text-[var(--destructive)]" />,
}

export function ToolCall({ block }: { block: MessageBlock }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
      >
        <Wrench size={14} />
        <span className="font-medium text-[var(--foreground)]">{block.name ?? 'Tool'}</span>
        {block.status && statusIcon[block.status]}
        <ChevronDown size={14} className={cn('ml-auto transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {block.input && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Input</p>
              <pre className="text-xs bg-[var(--muted)] rounded p-2 overflow-x-auto">{JSON.stringify(block.input, null, 2)}</pre>
            </div>
          )}
          {block.result !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Result</p>
              <pre className="text-xs bg-[var(--muted)] rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                {typeof block.result === 'string' ? block.result : JSON.stringify(block.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
