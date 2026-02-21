import { useState, useEffect, useCallback } from 'react'
import { Lightbulb, Minimize2, Telescope, Languages, Bookmark, Brain } from 'lucide-react'

const actions = [
  { id: 'explain', label: 'Explain', icon: Lightbulb },
  { id: 'simplify', label: 'Simplify', icon: Minimize2 },
  { id: 'deep_dive', label: 'Deep Dive', icon: Telescope },
  { id: 'translate', label: 'Translate', icon: Languages },
  { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { id: 'memory', label: 'Remember', icon: Brain },
] as const

type Action = typeof actions[number]['id']

interface SelectionToolbarProps {
  onAction: (action: Action, text: string) => void
}

export function SelectionToolbar({ onAction }: SelectionToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const handleMouseUp = useCallback(() => {
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!text || text.length < 3) { setPos(null); return }

      const range = sel?.getRangeAt(0)
      const node = range?.commonAncestorContainer as HTMLElement
      const el = node?.nodeType === 3 ? node.parentElement : node
      if (!el?.closest?.('[data-assistant-msg]')) { setPos(null); return }

      const rect = range?.getBoundingClientRect()
      if (rect) {
        // Clamp to viewport
        const x = Math.max(120, Math.min(rect.left + rect.width / 2, window.innerWidth - 120))
        const y = Math.max(48, rect.top - 8)
        setPos({ x, y })
        setSelectedText(text)
      }
    }, 10)
  }, [])

  useEffect(() => {
    const hide = () => setPos(null)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', hide)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('keydown', hide)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', hide)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('keydown', hide)
    }
  }, [handleMouseUp])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1500)
    return () => clearTimeout(t)
  }, [toast])

  const handleAction = (id: Action) => {
    onAction(id, selectedText)
    setPos(null)
    window.getSelection()?.removeAllRanges()
    if (id === 'bookmark') setToast('Bookmarked')
    if (id === 'memory') setToast('Saved to memory')
  }

  return (
    <>
      {pos && (
        <div
          className="fixed z-50 flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl p-1 animate-in fade-in zoom-in-95 duration-150"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
          onMouseDown={e => e.preventDefault()}
        >
          {actions.map(a => (
            <button
              key={a.id}
              onClick={() => handleAction(a.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors whitespace-nowrap"
              title={a.label}
            >
              <a.icon size={14} />
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </>
  )
}
