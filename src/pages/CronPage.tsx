import { useState, useEffect } from 'react'
import { Clock, Play, Trash2, Plus } from 'lucide-react'

interface CronJob { id: string; name?: string; schedule?: any; kind?: string; enabled?: boolean; lastRun?: string; state?: any; payload?: any }

function fmtSchedule(s: any): string {
  if (!s) return '—'
  if (typeof s === 'string') return s
  if (s.kind === 'every') {
    const mins = Math.round((s.everyMs || 0) / 60000)
    return mins >= 60 ? `every ${Math.round(mins / 60)}h` : `every ${mins}m`
  }
  if (s.kind === 'cron' && s.expression) return s.expression
  return s.kind || '—'
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', schedule: '', message: '' })

  const refresh = () => fetch('/api/admin/cron').then(r => r.json()).then(d => setJobs(d.jobs ?? [])).catch(() => {})
  useEffect(() => { refresh() }, [])

  async function handleRun(id: string) {
    await fetch(`/api/admin/cron/${id}/run`, { method: 'POST' })
    refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/cron/${id}`, { method: 'DELETE' })
    refresh()
  }

  async function handleCreate() {
    await fetch('/api/admin/cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowCreate(false)
    setForm({ name: '', schedule: '', message: '' })
    refresh()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cron Jobs</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90">
          <Plus size={14} /> New Job
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Job name" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]/40" />
          <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Schedule (e.g. every 5m, 0 9 * * *)" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]/40" />
          <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Message to send" className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]/40" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {jobs.map((job) => (
          <div key={job.id} className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <Clock size={18} className="text-[var(--muted-foreground)] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">{job.name ?? job.id}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{fmtSchedule(job.schedule)}{job.enabled === false ? ' (disabled)' : ''}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleRun(job.id)} className="p-1.5 rounded-md hover:bg-[var(--muted)]" title="Run now">
                <Play size={14} className="text-[var(--primary)]" />
              </button>
              <button onClick={() => handleDelete(job.id)} className="p-1.5 rounded-md hover:bg-[var(--destructive)]/10" title="Delete">
                <Trash2 size={14} className="text-[var(--destructive)]" />
              </button>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No cron jobs configured</p>}
      </div>
    </div>
  )
}
