import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Square, Paperclip, X } from 'lucide-react'

interface Attachment { fileName: string; mimeType: string; content: string; size: number }

const PRESETS = [
  { cmd: '/explain', label: 'Explain', prompt: 'Explain this in detail:' },
  { cmd: '/simplify', label: 'Simplify', prompt: 'Simplify this in plain language:' },
  { cmd: '/summarize', label: 'Summarize', prompt: 'Summarize the conversation so far.' },
  { cmd: '/code-review', label: 'Code Review', prompt: 'Review this code for bugs, performance, and best practices:' },
  { cmd: '/translate', label: 'Translate', prompt: 'Translate the following:' },
  { cmd: '/fix', label: 'Fix', prompt: 'Fix the issues in this code:' },
  { cmd: '/test', label: 'Write Tests', prompt: 'Write tests for this code:' },
  { cmd: '/improve', label: 'Improve', prompt: 'Improve this text for clarity and conciseness:' },
]

interface ChatInputProps {
  onSend: (text: string, attachments?: Attachment[]) => void
  onAbort: () => void
  isGenerating: boolean
  queueCount?: number
}

export function ChatInput({ onSend, onAbort, isGenerating, queueCount = 0 }: ChatInputProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [presetFilter, setPresetFilter] = useState('')
  const [presetIdx, setPresetIdx] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Show presets when typing /
  useEffect(() => {
    if (text === '/') { setShowPresets(true); setPresetFilter(''); setPresetIdx(0) }
    else if (text.startsWith('/') && !text.includes(' ')) { setShowPresets(true); setPresetFilter(text); setPresetIdx(0) }
    else setShowPresets(false)
  }, [text])

  const filtered = PRESETS.filter(p => !presetFilter || p.cmd.startsWith(presetFilter))

  function selectPreset(p: typeof PRESETS[number]) {
    setText(p.prompt + ' ')
    setShowPresets(false)
    ref.current?.focus()
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return
    onSend(trimmed || '(attached file)', files.length > 0 ? files : undefined)
    setText('')
    setFiles([])
    ref.current?.focus()
  }

  function handleKey(e: KeyboardEvent) {
    if (showPresets && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPresetIdx(i => Math.min(i + 1, filtered.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPresetIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); selectPreset(filtered[presetIdx]); return }
      if (e.key === 'Escape') { setShowPresets(false); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files
    if (!selected) return
    Array.from(selected).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setFiles(prev => [...prev, { fileName: file.name, mimeType: file.type || 'application/octet-stream', content: base64, size: file.size }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Queue indicator */}
        {queueCount > 0 && (
          <div className="flex items-center gap-2 mb-2 px-1 text-xs text-[var(--muted-foreground)]">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            {queueCount} message{queueCount > 1 ? 's' : ''} queued
          </div>
        )}

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--muted)] text-xs">
                <Paperclip size={10} />
                <span className="max-w-32 truncate">{f.fileName}</span>
                <span className="text-[var(--muted-foreground)]">({(f.size / 1024).toFixed(0)}KB)</span>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-400"><X size={10} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          {/* Prompt presets dropdown */}
          {showPresets && filtered.length > 0 && (
            <div className="absolute bottom-full left-12 mb-1 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden z-10">
              {filtered.map((p, i) => (
                <button key={p.cmd} onClick={() => selectPreset(p)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${i === presetIdx ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'}`}>
                  <span className="font-mono text-[var(--muted-foreground)]">{p.cmd}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button onClick={() => fileRef.current?.click()} className="p-3 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]" title="Attach file">
              <Paperclip size={18} />
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
            <textarea ref={ref} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder={isGenerating ? 'AI is responding… type to queue' : 'Message (/ for presets)'}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 focus:border-[var(--ring)] max-h-40 overflow-y-auto"
              style={{ fieldSizing: 'content' } as any}
            />
            {isGenerating ? (
              <button onClick={onAbort} className="p-3 rounded-lg bg-[var(--destructive)] text-white hover:opacity-90" title="Stop"><Square size={18} /></button>
            ) : (
              <button onClick={handleSend} disabled={!text.trim() && files.length === 0} className="p-3 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40" title="Send"><Send size={18} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
