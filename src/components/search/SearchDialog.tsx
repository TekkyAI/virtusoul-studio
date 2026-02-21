import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  id: string
  content: string
  role: string
  conversation_id: string
  conversation_title: string
  created_at: string
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) { inputRef.current?.focus(); setQuery(''); setResults([]) }
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => setResults(d.results ?? []))
        .catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open ? onClose() : null }
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
          <Search size={16} className="text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 py-3 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]">
            <X size={16} className="text-[var(--muted-foreground)]" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { navigate(`/chat`); onClose() }}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--muted)] transition-colors"
              >
                <p className="text-xs font-medium text-[var(--foreground)] truncate">{r.conversation_title}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{r.content.slice(0, 120)}</p>
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">No results</div>
        )}
      </div>
    </div>
  )
}
