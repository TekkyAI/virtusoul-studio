import { useState, useRef, useEffect } from 'react'
import { Terminal } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

export default function WebTerminalPage() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const { exec, running, output, setOutput } = useCliExec()
  const [log, setLog] = useState('')
  const outputRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (output) setLog(p => p + output)
  }, [output])

  useEffect(() => {
    outputRef.current?.scrollTo(0, outputRef.current.scrollHeight)
  }, [log])

  const run = () => {
    const cmd = input.trim()
    if (!cmd) return
    setHistory(h => [cmd, ...h.slice(0, 49)])
    setHistIdx(-1)
    setLog(p => p + `\n$ openclaw ${cmd}\n`)
    setOutput('')
    setInput('')
    exec(cmd, { onDone: (code) => setLog(p => p + `\n[exit ${code}]\n`) })
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (histIdx < history.length - 1) { const i = histIdx + 1; setHistIdx(i); setInput(history[i]) }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx > 0) { const i = histIdx - 1; setHistIdx(i); setInput(history[i]) }
      else { setHistIdx(-1); setInput('') }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <Terminal size={16} className="text-[var(--primary)]" />
        <span className="text-sm font-medium">Web Terminal</span>
        <span className="text-xs text-[var(--muted-foreground)]">— runs openclaw commands on the server</span>
        {log && <button onClick={() => setLog('')} className="ml-auto text-xs text-[var(--muted-foreground)] hover:underline">Clear</button>}
      </div>

      <pre ref={outputRef} className="flex-1 overflow-auto p-4 text-xs font-mono whitespace-pre-wrap text-[var(--foreground)]">
        {log || 'Type an openclaw command below. Example: agents list, channels status, health\n'}
      </pre>

      <div className="border-t border-[var(--border)] p-3 flex gap-2">
        <span className="text-sm text-[var(--muted-foreground)] py-1.5">openclaw</span>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
          placeholder="agents list" disabled={running} autoFocus
          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--muted)] text-sm font-mono" />
        <button onClick={run} disabled={running || !input.trim()}
          className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">
          {running ? '...' : 'Run'}
        </button>
      </div>
    </div>
  )
}
