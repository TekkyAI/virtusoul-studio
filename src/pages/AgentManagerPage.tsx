import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, Plus, Trash2, FileText, Brain, Upload, RefreshCw, Save, ChevronRight, X } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'
import { AGENT_ICONS } from '../components/layout/ContextSidebar'

type Agent = { id: string; workspace: string; model: string; bindings: number; isDefault: boolean }
type MemoryResult = { file: string; score: number; text: string }

export default function AgentManagerPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [tab, setTab] = useState<'soul' | 'memory' | 'files'>('soul')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const { run } = useCliExec()
  const [searchParams] = useSearchParams()
  const selected = searchParams.get('agent')

  // Open create modal from sidebar "Add Agent" link
  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreate(true)
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await run('agents list')
      setAgents(res.data ?? [])
    } catch {} finally { setLoading(false) }
  }, [run])

  useEffect(() => { load() }, [load])

  const agent = agents.find(a => a.id === selected)
  const fileParam = searchParams.get('file')

  return (
    <div className="flex flex-col h-full">
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-[var(--muted-foreground)] text-sm">
          Select an agent from the sidebar
        </div>
      ) : fileParam ? (
        <FileEditor filePath={fileParam} />
      ) : (
        <>
          <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-4">
            <div className="flex gap-1">
              {(['soul', 'memory', 'files'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${tab === t ? 'bg-[var(--primary)] text-black font-medium' : 'hover:bg-[var(--muted)]'}`}>
                  {t === 'soul' ? '📜 SOUL.md' : t === 'memory' ? '🧠 Memory' : '📁 Files'}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <DeleteAgent id={selected} onDeleted={load} />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {tab === 'soul' && <SoulEditor agentId={selected} />}
            {tab === 'memory' && <MemoryBrowser agentId={selected} />}
            {tab === 'files' && <FileBrowser agentId={selected} workspace={agent?.workspace || ''} />}
          </div>
        </>
      )}

      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load() }} />}
    </div>
  )
}

function FileEditor({ filePath }: { filePath: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setLoading(true)
    setDirty(false)
    fetch(`/api/admin/workspace/file?path=${encodeURIComponent(filePath)}`).then(r => r.json())
      .then(d => setContent(d.content ?? ''))
      .finally(() => setLoading(false))
  }, [filePath])

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/workspace/file', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    })
    setSaving(false)
    setDirty(false)
  }

  if (loading) return <div className="p-4 text-sm text-[var(--muted-foreground)]">Loading...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--muted-foreground)]">
          {filePath} {dirty && <span className="text-[var(--primary)]">●</span>}
        </span>
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-black text-xs font-medium disabled:opacity-30">
          <Save size={12} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <textarea value={content} onChange={e => { setContent(e.target.value); setDirty(true) }}
        className="flex-1 p-4 bg-transparent font-mono text-sm resize-none focus:outline-none" spellCheck={false} />
    </div>
  )
}

function SoulEditor({ agentId }: { agentId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/agents/${agentId}/prompt`).then(r => r.json())
      .then(d => setContent(d.content ?? d.prompt ?? ''))
      .finally(() => setLoading(false))
  }, [agentId])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/admin/agents/${agentId}/prompt`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setSaving(false)
  }

  if (loading) return <div className="p-4 text-sm text-[var(--muted-foreground)]">Loading...</div>

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted-foreground)]"><FileText size={12} className="inline mr-1" />SOUL.md — Agent system prompt</span>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-black text-xs font-medium disabled:opacity-50">
          <Save size={12} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)}
        className="flex-1 p-4 bg-transparent text-sm font-mono resize-none focus:outline-none"
        placeholder="# Agent System Prompt..." />
    </div>
  )
}

function MemoryBrowser({ agentId }: { agentId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MemoryResult[]>([])
  const [status, setStatus] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const { run, exec, running } = useCliExec()

  useEffect(() => {
    run(`memory status`).then(r => setStatus(r.data ?? r)).catch(() => {})
  }, [run])

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await run(`memory search --query "${query.replace(/"/g, '\\"')}"`)
      setResults(r.data?.results ?? r.data ?? [])
    } catch {} finally { setSearching(false) }
  }

  const reindex = () => exec('memory index --force')

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search agent memory..." className="flex-1 px-3 py-2 rounded-lg bg-[var(--muted)] text-sm" />
        <button onClick={search} disabled={searching} className="px-3 py-2 rounded-lg bg-[var(--primary)] text-black text-xs font-medium">
          {searching ? '...' : 'Search'}
        </button>
        <button onClick={reindex} disabled={running} className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs">
          <Brain size={12} className={`inline mr-1 ${running ? 'animate-spin' : ''}`} />Reindex
        </button>
      </div>

      {status && (
        <div className="text-xs text-[var(--muted-foreground)]">
          Index: {status.indexed ?? '?'} files • Provider: {status.provider ?? 'unknown'}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-[var(--muted-foreground)]">{r.file}</span>
                {r.score != null && <span className="text-[10px] text-[var(--muted-foreground)]">{(r.score * 100).toFixed(0)}%</span>}
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FileBrowser({ agentId, workspace }: { agentId: string; workspace: string }) {
  const [files, setFiles] = useState<any[]>([])
  const [path, setPath] = useState('/')
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [editPath, setEditPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/workspace?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    setFiles(data.files ?? data.entries ?? [])
  }, [path])

  useEffect(() => { load() }, [load])

  const openFile = async (p: string) => {
    const res = await fetch(`/api/admin/workspace/file?path=${encodeURIComponent(p)}`)
    const data = await res.json()
    setFileContent(data.content ?? '')
    setEditPath(p)
  }

  const saveFile = async () => {
    setSaving(true)
    await fetch('/api/admin/workspace/file', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: editPath, content: fileContent }),
    })
    setSaving(false)
  }

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const text = await file.text()
    const uploadPath = path === '/' ? `/${file.name}` : `${path}/${file.name}`
    await fetch('/api/admin/workspace/file', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: uploadPath, content: text }),
    })
    setUploading(false)
    load()
  }

  if (fileContent !== null) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button onClick={() => setFileContent(null)} className="text-xs hover:underline">← Back</button>
            <span className="text-xs font-mono text-[var(--muted-foreground)]">{editPath}</span>
          </div>
          <button onClick={saveFile} disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-black text-xs font-medium">
            <Save size={12} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <textarea value={fileContent} onChange={e => setFileContent(e.target.value)}
          className="flex-1 p-4 bg-transparent text-sm font-mono resize-none focus:outline-none" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          {path !== '/' && <button onClick={() => setPath(path.split('/').slice(0, -1).join('/') || '/')} className="hover:underline">← Up</button>}
          <span className="font-mono">{workspace}{path}</span>
        </div>
        <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs cursor-pointer hover:bg-[var(--muted)] ${uploading ? 'opacity-50' : ''}`}>
          <Upload size={12} /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
        </label>
      </div>
      {files.map((f: any, i: number) => (
        <button key={i} onClick={() => f.type === 'directory' ? setPath(f.path || `${path}/${f.name}`) : openFile(f.path || `${path}/${f.name}`)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--muted)] flex items-center gap-2 text-sm">
          {f.type === 'directory' ? '📁' : '📄'} {f.name}
          {f.size != null && <span className="ml-auto text-xs text-[var(--muted-foreground)]">{(f.size / 1024).toFixed(1)}KB</span>}
        </button>
      ))}
      {files.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-4">Empty directory</p>}
    </div>
  )
}

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [icon, setIcon] = useState('Bot')
  const [models, setModels] = useState<any[]>([])
  const { exec, run, running, output } = useCliExec()

  useEffect(() => {
    run('models list').then(r => setModels(r.data?.models ?? [])).catch(() => {})
  }, [run])

  const create = async () => {
    const safeName = name.replace(/\s+/g, '-').toLowerCase()
    const args = [`agents add "${safeName}" --non-interactive --workspace ~/.openclaw/agents/${safeName}/workspace`]
    if (model) args[0] += ` --model ${model}`
    // Save icon
    const icons = JSON.parse(localStorage.getItem('vs_agent_icons') || '{}')
    icons[safeName] = icon
    localStorage.setItem('vs_agent_icons', JSON.stringify(icons))
    await exec(args[0], { onDone: (code) => {
      if (code === 0) { window.dispatchEvent(new Event('agents-changed')); onCreated() }
    }})
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-[480px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="font-medium">Create Agent</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Agent Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ops, research, writer"
              className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Icon</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(AGENT_ICONS).map(([key, Icon]) => (
                <button key={key} onClick={() => setIcon(key)} title={key}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${icon === key ? 'bg-[var(--primary)] text-black' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--muted-foreground)] mb-1 block">Model</label>
            <select value={model} onChange={e => setModel(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] text-sm">
              <option value="">Default</option>
              {models.map(m => <option key={m.key} value={m.key}>{m.name} ({m.key})</option>)}
            </select>
          </div>
          {output && <pre className="text-xs bg-[var(--muted)] rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap">{output}</pre>}
          <button onClick={create} disabled={running || !name.trim()}
            className="w-full py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">
            {running ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteAgent({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const { exec, running } = useCliExec()

  const del = async () => {
    await exec(`agents delete ${id}`, { onDone: (code) => { if (code === 0) onDeleted() } })
  }

  if (!confirm) return (
    <button onClick={() => setConfirm(true)} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-400/10">
      <Trash2 size={12} /> Delete
    </button>
  )

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-400">Delete {id}?</span>
      <button onClick={del} disabled={running} className="px-2 py-1 rounded text-xs bg-red-600 text-white">Yes</button>
      <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded text-xs border border-[var(--border)]">No</button>
    </div>
  )
}
