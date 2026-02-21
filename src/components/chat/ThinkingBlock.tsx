import { useState } from 'react'
import { ChevronDown, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThinkingBlock({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
      >
        <Brain size={14} className={cn(isStreaming && 'animate-pulse text-[var(--primary)]')} />
        <span>{isStreaming ? 'Thinking…' : 'Thought process'}</span>
        <ChevronDown size={14} className={cn('ml-auto transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-[var(--muted-foreground)] whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}
