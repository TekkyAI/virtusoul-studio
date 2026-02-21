import { useState, useEffect } from 'react'
import { Bookmark, Trash2 } from 'lucide-react'

interface BookmarkItem {
  id: string
  selectedText: string | null
  note: string | null
  conversationId: string | null
  createdAt: string
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])

  useEffect(() => {
    fetch('/api/bookmarks').then(r => r.json()).then(d => setBookmarks(d.bookmarks ?? [])).catch(() => {})
  }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted-foreground)] text-sm">
        <div className="text-center space-y-2">
          <Bookmark size={32} className="mx-auto opacity-40" />
          <p>No bookmarks yet</p>
          <p className="text-xs">Select text in chat and click Bookmark to save</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Bookmarks</h2>
      {bookmarks.map((b) => (
        <div key={b.id} className="group flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <Bookmark size={16} className="text-[var(--primary)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--foreground)] line-clamp-3">{b.selectedText || b.note || '(empty)'}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{new Date(b.createdAt).toLocaleString()}</p>
          </div>
          <button
            onClick={() => handleDelete(b.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--destructive)]/10 text-[var(--destructive)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
