import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, FileText, Save, ChevronRight, ChevronDown, RefreshCw, File } from 'lucide-react'

const PINNED = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'USER.md', 'TOOLS.md', 'BOOTSTRAP.md', 'HEARTBEAT.md']

type FsEntry = { name: string; type: string; path: string; size: number }

export default function WorkspacePage() {
  const [tree, setTree] = useState<Record<string, FsEntry[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['/']))
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadDir = useCallback(async (path: string) => {
    const res = await fetch(`/api/admin/workspace?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    setTree(prev => ({ ...prev, [path]: data.files ?? [] }))
    return data.files ?? []
  }, [])

  useEffect(() => { loadDir('/').then(() => setLoading(false)) }, [loadDir])

  const toggle = async (path: string) => {
    const next = new Set(expanded)
    if (next.has(path)) { next.delete(path) } else {
      next.add(path)
      if (!tree[path]) await loadDir(path)
    }
    setExpanded(next)
  }

  const openFile = async (path: string) => {
    const res = await fetch(`/api/admin/workspace/file?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    setContent(data.content ?? '')
    setSelected(path)
    setDirty(false)
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    await fetch('/api/admin/workspace/file', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: selected, content }),
    })
    setSaving(false)
    setDirty(false)
  }

  const rootFiles = tree['/'] ?? []
  const pinned = rootFiles.filter(f => PINNED.includes(f.name))
  const fileName = selected?.split('/').pop() ?? ''
  const isMd = fileName.endsWith('.md')

  return (
    <div className="flex h-full">
      {/* Left panel — file tree */}
      <div className="w-56 border-r border-[var(--border)] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">Explorer</span>
          <button onClick={() => loadDir('/')} className="p-1 rounded hover:bg-[var(--muted)]">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pinned files */}
          {pinned.length > 0 && (
            <div className="px-1 py-1.5">
              <p className="px-2 pb-1 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Agent Files</p>
              {pinned.map(f => (
                <button key={f.name} onClick={() => openFile(f.path || f.name)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left ${selected === (f.path || f.name) ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'}`}>
                  <FileText size={12} className="shrink-0 text-[var(--primary)]" />
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-[var(--border)] px-1 py-1.5">
            <p className="px-2 pb-1 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Files</p>
            <TreeNode path="/" entries={rootFiles.filter(f => !PINNED.includes(f.name))} tree={tree} expanded={expanded}
              selected={selected} onToggle={toggle} onOpen={openFile} loadDir={loadDir} depth={0} />
          </div>
        </div>
      </div>

      {/* Right panel — editor / preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
            <div className="text-center space-y-2">
              <FolderOpen size={32} className="mx-auto opacity-40" />
              <p>Select a file to view or edit</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <span className="text-xs font-mono text-[var(--muted-foreground)]">
                {selected} {dirty && <span className="text-[var(--primary)]">●</span>}
              </span>
              <button onClick={save} disabled={saving || !dirty}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium disabled:opacity-30">
                <Save size={12} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <textarea value={content} onChange={e => { setContent(e.target.value); setDirty(true) }}
              className="flex-1 p-4 bg-transparent font-mono text-sm resize-none focus:outline-none"
              spellCheck={false} />
          </>
        )}
      </div>
    </div>
  )
}

function TreeNode({ path, entries, tree, expanded, selected, onToggle, onOpen, loadDir, depth }: {
  path: string; entries: FsEntry[]; tree: Record<string, FsEntry[]>; expanded: Set<string>
  selected: string | null; onToggle: (p: string) => void; onOpen: (p: string) => void
  loadDir: (p: string) => Promise<FsEntry[]>; depth: number
}) {
  const dirs = entries.filter(e => e.type === 'directory')
  const files = entries.filter(e => e.type === 'file')
  const pl = depth * 12

  return (
    <>
      {dirs.map(d => {
        const fullPath = d.path || `${path === '/' ? '' : path}/${d.name}`
        const isOpen = expanded.has(fullPath)
        const children = tree[fullPath] ?? []
        return (
          <div key={d.name}>
            <button onClick={() => onToggle(fullPath)} style={{ paddingLeft: pl + 8 }}
              className="w-full flex items-center gap-1 py-1 pr-2 rounded text-xs text-[var(--foreground)] hover:bg-[var(--muted)]">
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <FolderOpen size={12} className="text-[var(--primary)]" />
              {d.name}
            </button>
            {isOpen && children.length > 0 && (
              <TreeNode path={fullPath} entries={children} tree={tree} expanded={expanded}
                selected={selected} onToggle={onToggle} onOpen={onOpen} loadDir={loadDir} depth={depth + 1} />
            )}
          </div>
        )
      })}
      {files.map(f => {
        const fullPath = f.path || `${path === '/' ? '' : path}/${f.name}`
        return (
          <button key={f.name} onClick={() => onOpen(fullPath)} style={{ paddingLeft: pl + 22 }}
            className={`w-full flex items-center gap-1.5 py-1 pr-2 rounded text-xs text-left ${selected === fullPath ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
            <File size={11} />
            {f.name}
          </button>
        )
      })}
    </>
  )
}
