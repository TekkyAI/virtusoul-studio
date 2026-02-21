import { useState, useEffect, useCallback } from 'react'
import { Globe, RefreshCw, Play, Square, Camera, User, Monitor } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

export default function BrowserManagerPage() {
  const { run, exec, output, running } = useCliExec()
  const [status, setStatus] = useState<any>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  const [tabs, setTabs] = useState<any[]>([])
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, p] = await Promise.all([run('browser status'), run('browser profiles')])
    setStatus(s)
    setProfiles(Array.isArray(p) ? p : p?.profiles ?? [])
    if (s?.running) {
      const t = await run('browser tabs')
      setTabs(Array.isArray(t) ? t : t?.tabs ?? [])
    } else {
      setTabs([])
    }
    setLoading(false)
  }, [run])

  useEffect(() => { load() }, [load])

  const start = async () => { await exec('browser start'); setTimeout(load, 2000) }
  const stop = async () => { await exec('browser stop'); setTimeout(load, 1500) }

  const takeScreenshot = async () => {
    const r = await run('browser screenshot')
    if (r?.path || r?.media) setScreenshot(r.media || r.path)
    else if (typeof r === 'string' && r.startsWith('MEDIA:')) setScreenshot(r.slice(6))
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">Browser</h1>
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status Card */}
      {status && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${status.running ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              <span className="text-sm font-medium">{status.running ? 'Running' : 'Stopped'}</span>
              {status.profile && <span className="text-xs text-[var(--muted-foreground)]">Profile: {status.profile}</span>}
            </div>
            <div className="flex gap-2">
              {status.running ? (
                <>
                  <button onClick={takeScreenshot} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80">
                    <Camera size={12} /> Screenshot
                  </button>
                  <button onClick={stop} disabled={running} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                    <Square size={12} /> Stop
                  </button>
                </>
              ) : (
                <button onClick={start} disabled={running} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
                  <Play size={12} /> Start
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              ['CDP Port', status.cdpPort],
              ['CDP Ready', status.cdpReady ? '✅' : '❌'],
              ['Headless', status.headless ? 'Yes' : 'No'],
              ['PID', status.pid ?? '—'],
              ['Browser', status.chosenBrowser || status.detectedBrowser || '—'],
              ['Executable', status.detectedExecutablePath?.split('/').pop() || '—'],
              ['Sandbox', status.noSandbox ? 'Disabled' : 'Enabled'],
              ['Attach Only', status.attachOnly ? 'Yes' : 'No'],
            ].map(([k, v]) => (
              <div key={k as string} className="bg-[var(--muted)] rounded-lg p-2">
                <p className="text-[10px] text-[var(--muted-foreground)]">{k}</p>
                <p className="font-medium truncate">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Monitor size={14} /> Open Tabs ({tabs.length})</h2>
          <div className="space-y-1">
            {tabs.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] text-xs">
                <span className="text-[var(--muted-foreground)] w-4">{i + 1}</span>
                <span className="truncate flex-1">{t.title || t.url || 'Untitled'}</span>
                <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-48">{t.url}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profiles */}
      {profiles.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 mb-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><User size={14} /> Profiles</h2>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p: any) => (
              <div key={p.name || p} className="px-3 py-2 rounded-lg bg-[var(--muted)] text-xs flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${(p.name || p) === status?.profile ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                {p.name || p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot */}
      {screenshot && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="text-sm font-bold mb-3">Screenshot</h2>
          <img src={screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`}
            alt="Browser screenshot" className="rounded-lg max-w-full border border-[var(--border)]" />
        </div>
      )}

      {/* CLI output */}
      {output && (
        <pre className="mt-4 p-3 rounded-lg bg-[var(--muted)] text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">{output}</pre>
      )}
    </div>
  )
}
