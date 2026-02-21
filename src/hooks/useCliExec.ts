import { useState, useCallback } from 'react'

/** Run an openclaw CLI command via SSE and collect output */
export function useCliExec() {
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')

  const exec = useCallback(async (command: string, opts?: { onDone?: (code: number) => void }) => {
    setRunning(true)
    setOutput('')
    try {
      const res = await fetch('/api/cli/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      const reader = res.body?.getReader()
      if (!reader) return
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        let event = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7)
          else if (line.startsWith('data: ')) {
            try {
              const d = JSON.parse(line.slice(6))
              if (event === 'exit') opts?.onDone?.(d.code)
              else if (d.text) setOutput(p => p + d.text)
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setOutput(p => p + `\nError: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }, [])

  /** Quick JSON command via GET */
  const run = useCallback(async (cmd: string) => {
    const res = await fetch(`/api/cli/run?cmd=${encodeURIComponent(cmd)}`)
    return res.json()
  }, [])

  return { exec, run, running, output, setOutput }
}
