import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, RefreshCw, Search, Download, Info, X, AlertTriangle, CheckCircle, XCircle, Power } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

type Skill = {
  name: string; description: string; emoji: string
  eligible: boolean; disabled: boolean; blockedByAllowlist: boolean
  source: string; bundled: boolean; homepage?: string
  missing?: { bins: string[]; anyBins: string[]; env: string[]; config: string[]; os: string[] }
}
type HubResult = { name: string; version: string; score: number }

export default function SkillsManagerPage() {
  const { run, exec, output, running } = useCliExec()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Skill | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [tab, setTab] = useState<'installed' | 'hub'>('installed')
  const [hubQuery, setHubQuery] = useState('')
  const [hubResults, setHubResults] = useState<HubResult[]>([])
  const [hubSearching, setHubSearching] = useState(false)
  const [filter, setFilter] = useState<'all' | 'ready' | 'missing'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await run('skills list')
    setSkills(Array.isArray(r) ? r : r?.data?.skills ?? r?.skills ?? [])
    setLoading(false)
  }, [run])

  useEffect(() => { load() }, [load])

  const showInfo = async (s: Skill) => {
    setSelected(s)
    const r = await run(`skills info ${s.name}`)
    setDetail(r?.data ?? r)
  }

  const searchHub = async () => {
    if (!hubQuery.trim()) return
    setHubSearching(true)
    try {
      const r = await run(`clawhub search ${hubQuery.trim()}`)
      // clawhub search returns text lines like "name v1.0.0  Description  (score)"
      // Try to parse from stdout
      if (typeof r === 'string') {
        const lines = r.split('\n').filter((l: string) => l.trim() && !l.startsWith('-'))
        setHubResults(lines.map((l: string) => {
          const m = l.match(/^(\S+)\s+v([\d.]+)\s+(.+?)\s+\(([\d.]+)\)/)
          return m ? { name: m[1], version: m[2], score: parseFloat(m[4]) } : null
        }).filter(Boolean) as HubResult[])
      } else {
        setHubResults([])
      }
    } catch { setHubResults([]) }
    setHubSearching(false)
  }

  const installFromHub = async (slug: string) => {
    await exec(`clawhub install ${slug} --force`)
    load()
  }

  const filtered = skills.filter(s => {
    if (filter === 'ready') return s.eligible
    if (filter === 'missing') return !s.eligible
    return true
  })

  const readyCount = skills.filter(s => s.eligible).length
  const missingCount = skills.filter(s => !s.eligible).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--primary)]" />
          <h1 className="text-lg font-bold">Skills</h1>
          <span className="text-xs text-[var(--muted-foreground)]">{skills.length} total · {readyCount} ready</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('installed')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'installed' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>Installed</button>
          <button onClick={() => setTab('hub')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'hub' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
            <Download size={12} className="inline mr-1" />ClawHub
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-[var(--muted)]">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {tab === 'installed' ? (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setFilter('all')} className={`px-2.5 py-1 text-[10px] rounded-lg ${filter === 'all' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>All ({skills.length})</button>
            <button onClick={() => setFilter('ready')} className={`px-2.5 py-1 text-[10px] rounded-lg flex items-center gap-1 ${filter === 'ready' ? 'bg-emerald-400/15 text-emerald-400' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
              <CheckCircle size={10} /> Ready ({readyCount})
            </button>
            <button onClick={() => setFilter('missing')} className={`px-2.5 py-1 text-[10px] rounded-lg flex items-center gap-1 ${filter === 'missing' ? 'bg-amber-400/15 text-amber-400' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'}`}>
              <XCircle size={10} /> Missing Deps ({missingCount})
            </button>
          </div>

          {/* Skills Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(s => (
              <div key={s.name} onClick={() => showInfo(s)}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 cursor-pointer hover:border-[var(--primary)]/30 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg">{s.emoji || '⚡'}</span>
                  <span className={`w-2 h-2 rounded-full ${s.eligible ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                </div>
                <p className="text-xs font-medium truncate">{s.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] line-clamp-2 mt-0.5">{s.description}</p>
                {!s.eligible && s.missing && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.missing.bins?.map(b => (
                      <span key={b} className="px-1 py-0.5 text-[8px] rounded bg-amber-400/10 text-amber-400">{b}</span>
                    ))}
                    {s.missing.anyBins?.map(b => (
                      <span key={b} className="px-1 py-0.5 text-[8px] rounded bg-amber-400/10 text-amber-400">{b}</span>
                    ))}
                    {s.missing.env?.map(e => (
                      <span key={e} className="px-1 py-0.5 text-[8px] rounded bg-red-400/10 text-red-400">${e}</span>
                    ))}
                    {s.missing.os?.map(o => (
                      <span key={o} className="px-1 py-0.5 text-[8px] rounded bg-zinc-400/10 text-zinc-400">{o}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] text-[var(--muted-foreground)]">{s.source === 'openclaw-bundled' ? 'bundled' : 'community'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ClawHub Tab */
        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 mb-4 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-400">Community skills — install at your own risk</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">
                ClawHub skills are community-contributed and not security-audited. Some may request API keys, access tokens, or system permissions. Review the SKILL.md before enabling. Never share sensitive credentials with untrusted skills.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] border border-[var(--border)]">
              <Search size={14} className="text-[var(--muted-foreground)]" />
              <input value={hubQuery} onChange={e => setHubQuery(e.target.value)} placeholder="Search ClawHub skills..."
                className="flex-1 bg-transparent text-xs focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && searchHub()} />
            </div>
            <button onClick={searchHub} disabled={hubSearching} className="px-4 py-2 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
              {hubSearching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {hubResults.length > 0 && (
            <div className="space-y-2">
              {hubResults.map(r => {
                const alreadyInstalled = skills.some(s => s.name === r.name)
                return (
                  <div key={r.name} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium">{r.name}</p>
                        <span className="text-[9px] text-[var(--muted-foreground)]">v{r.version}</span>
                      </div>
                    </div>
                    {alreadyInstalled ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Installed</span>
                    ) : (
                      <button onClick={() => installFromHub(r.name)} disabled={running}
                        className="px-3 py-1.5 text-[10px] rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center gap-1">
                        <Download size={10} /> Install
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {hubResults.length === 0 && hubQuery && !hubSearching && (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-8">No results. Try different keywords.</p>
          )}

          {!hubQuery && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <Download size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Search ClawHub for community skills</p>
              <p className="text-xs mt-1">800+ skills: smart home, email, calendar, voice, memory, and more</p>
            </div>
          )}

          {output && (
            <pre className="mt-4 p-3 rounded-lg bg-[var(--muted)] text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">{output}</pre>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selected && detail && (
        <SkillDetailModal detail={detail} onClose={() => { setSelected(null); setDetail(null) }} onSetupDone={() => { setSelected(null); setDetail(null); load() }} />
      )}
    </div>
  )
}

function SkillDetailModal({ detail, onClose, onSetupDone }: { detail: any; onClose: () => void; onSetupDone: () => void }) {
  const [envValues, setEnvValues] = useState<Record<string, string>>({})
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [installOutput, setInstallOutput] = useState('')
  const [installing, setInstalling] = useState('')
  const logRef = useRef<HTMLPreElement>(null)

  const missingEnv = detail.missing?.env ?? []
  const missingConfig = detail.missing?.config ?? []
  const missingBins = detail.missing?.bins ?? []
  const missingOs = detail.missing?.os ?? []
  const hasSetupFields = missingEnv.length > 0 || missingConfig.length > 0
  const installOptions = detail.install ?? []

  const runInstall = async (inst: any) => {
    setInstalling(inst.id); setInstallOutput('')
    try {
      const res = await fetch('/api/admin/skill-install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: inst.kind, bins: inst.bins, label: inst.label }) })
      const reader = res.body?.getReader(); if (!reader) return
      const dec = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try { const d = JSON.parse(line.slice(6)); if (d.text) { setInstallOutput(p => p + d.text); requestAnimationFrame(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }) } if (d.code !== undefined) { setInstallOutput(p => p + (d.code === 0 ? '\n✅ Installed successfully\n' : `\n❌ Install failed (exit ${d.code})\n`)); if (d.code === 0) setTimeout(onSetupDone, 1500) } } catch {}
        }
      }
    } catch (e: any) { setInstallOutput(p => p + `\n❌ ${e.message}\n`) }
    finally { setInstalling('') }
  }

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      const body: any = {}
      if (Object.values(envValues).some(v => v.trim())) body.envVars = envValues
      if (Object.values(configValues).some(v => v.trim())) body.configKeys = configValues
      const res = await fetch('/api/admin/skill-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setMsg('✅ Saved! Restart gateway for changes to take effect.')
        setTimeout(onSetupDone, 1500)
      } else { const d = await res.json(); setMsg(`❌ ${d.error ?? 'Failed'}`) }
    } catch (e: any) { setMsg(`❌ ${e.message}`) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{detail.emoji}</span>
            <h2 className="text-sm font-bold">{detail.name}</h2>
            <span className={`w-2 h-2 rounded-full ${detail.eligible ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]"><X size={14} /></button>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mb-4">{detail.description}</p>

        {detail.source !== 'openclaw-bundled' && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5 mb-3 flex items-start gap-2">
            <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-400">Community skill — not audited. Review before enabling.</p>
          </div>
        )}

        <div className="space-y-2 text-xs mb-4">
          <div><span className="text-[var(--muted-foreground)]">Source:</span> {detail.source === 'openclaw-bundled' ? 'Bundled' : detail.source}</div>
          <div><span className="text-[var(--muted-foreground)]">Status:</span> {detail.eligible ? <span className="text-emerald-400">✅ Ready</span> : <span className="text-amber-400">⚙️ Setup needed</span>}</div>
          {detail.homepage && <div><span className="text-[var(--muted-foreground)]">Docs:</span> <a href={detail.homepage} target="_blank" className="text-[var(--primary)] underline">{detail.homepage}</a></div>}
        </div>

        {/* Requirements status */}
        {(detail.requirements?.bins?.length > 0 || detail.requirements?.env?.length > 0 || detail.requirements?.config?.length > 0) && (
          <div className="mb-4">
            <p className="text-[10px] font-medium mb-2 text-[var(--muted-foreground)]">Requirements</p>
            <div className="flex flex-wrap gap-1">
              {detail.requirements.bins?.map((b: string) => (
                <span key={b} className={`px-1.5 py-0.5 text-[9px] rounded ${missingBins.includes(b) ? 'bg-red-400/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}>{b} {missingBins.includes(b) ? '✗' : '✓'}</span>
              ))}
              {detail.requirements.env?.map((e: string) => (
                <span key={e} className={`px-1.5 py-0.5 text-[9px] rounded ${missingEnv.includes(e) ? 'bg-red-400/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}>${e} {missingEnv.includes(e) ? '✗' : '✓'}</span>
              ))}
              {detail.requirements.config?.map((c: string) => (
                <span key={c} className={`px-1.5 py-0.5 text-[9px] rounded ${missingConfig.includes(c) ? 'bg-red-400/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}>{c} {missingConfig.includes(c) ? '✗' : '✓'}</span>
              ))}
              {missingOs.map((o: string) => (
                <span key={o} className="px-1.5 py-0.5 text-[9px] rounded bg-zinc-400/10 text-zinc-400">Requires {o}</span>
              ))}
            </div>
          </div>
        )}

        {/* Install missing binaries */}
        {missingBins.length > 0 && installOptions.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3 mb-4 space-y-2">
            <p className="text-[10px] font-medium">Install missing tools</p>
            {installOptions.map((inst: any) => (
              <div key={inst.id} className="flex items-center justify-between">
                <code className="text-[10px] font-mono text-[var(--muted-foreground)]">{inst.kind === 'brew' ? `brew install ${inst.bins?.join(' ')}` : inst.kind === 'node' ? `npm install -g ${inst.bins?.join(' ')}` : inst.label}</code>
                <button onClick={() => runInstall(inst)} disabled={!!installing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40">
                  <Download size={10} /> {installing === inst.id ? 'Installing…' : 'Install'}
                </button>
              </div>
            ))}
            {installOutput && (
              <pre ref={logRef} className="mt-2 p-2.5 rounded-md bg-[var(--background)] text-[10px] font-mono max-h-40 overflow-auto whitespace-pre-wrap">{installOutput}</pre>
            )}
          </div>
        )}

        {/* Setup form for env vars and config */}
        {hasSetupFields && (
          <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 space-y-3">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <Power size={12} className="text-[var(--primary)]" /> Configure to enable
            </p>

            {missingEnv.map((envKey: string) => (
              <div key={envKey} className="space-y-1">
                <label className="text-[10px] text-[var(--muted-foreground)]">{envKey}</label>
                <input type="password" value={envValues[envKey] ?? ''} onChange={e => setEnvValues(p => ({ ...p, [envKey]: e.target.value }))}
                  placeholder={`Enter ${envKey}`}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
                <p className="text-[9px] text-[var(--muted-foreground)]">Saved to ~/.openclaw/.env</p>
              </div>
            ))}

            {missingConfig.map((cfgKey: string) => (
              <div key={cfgKey} className="space-y-1">
                <label className="text-[10px] text-[var(--muted-foreground)]">{cfgKey}</label>
                <input type="text" value={configValues[cfgKey] ?? ''} onChange={e => setConfigValues(p => ({ ...p, [cfgKey]: e.target.value }))}
                  placeholder={`Enter value for ${cfgKey}`}
                  className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--ring)]" />
                <p className="text-[9px] text-[var(--muted-foreground)]">Saved to openclaw.json → {cfgKey}</p>
              </div>
            ))}

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save & Enable Skill'}
            </button>
            {msg && <p className="text-[10px] text-center">{msg}</p>}
          </div>
        )}

        {detail.eligible && (
          <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 mt-4 text-center">
            <p className="text-xs text-emerald-400">✅ This skill is active and ready to use</p>
          </div>
        )}

        {!detail.eligible && !hasSetupFields && missingBins.length === 0 && missingOs.length > 0 && (
          <div className="rounded-lg border border-zinc-400/20 bg-zinc-400/5 p-3 mt-4 text-center">
            <p className="text-xs text-zinc-400">This skill requires {missingOs.join(', ')} and cannot be enabled on this system.</p>
          </div>
        )}
      </div>
    </div>
  )
}
