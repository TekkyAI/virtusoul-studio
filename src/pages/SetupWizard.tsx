import { useState } from 'react'
import { CheckCircle, Loader2, Wifi, WifiOff, Lock, ArrowRight } from 'lucide-react'

type Step = 'password' | 'gateway' | 'done'

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [gwStatus, setGwStatus] = useState<'checking' | 'connected' | 'failed'>('checking')

  async function savePassword() {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/setup/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return }
      setStep('gateway')
      checkGateway()
    } catch { setError('Connection failed') }
    setSaving(false)
  }

  async function checkGateway() {
    setGwStatus('checking')
    try {
      const res = await fetch('/api/gateway/status')
      const d = await res.json()
      setGwStatus(d.status === 'connected' ? 'connected' : 'failed')
    } catch { setGwStatus('failed') }
  }

  function finish() {
    fetch('/api/setup/complete', { method: 'POST' }).then(() => onComplete()).catch(() => onComplete())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Virtu<span className="text-[var(--primary)]">Soul</span> Studio</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">First-time setup</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['password', 'gateway'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-[var(--primary)] text-black' :
                (['password', 'gateway', 'done'].indexOf(step) > i) ? 'bg-emerald-500 text-white' :
                'bg-[var(--muted)] text-[var(--muted-foreground)]'
              }`}>{(['password', 'gateway', 'done'].indexOf(step) > i) ? '✓' : i + 1}</div>
              {i < 1 && <div className="w-12 h-0.5 bg-[var(--border)]" />}
            </div>
          ))}
        </div>

        {/* Step 1: Password */}
        {step === 'password' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock size={18} className="text-[var(--primary)]" />
              <h2 className="text-lg font-semibold">Set Admin Password</h2>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">This password protects your Studio dashboard.</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)" autoFocus
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password" onKeyDown={e => e.key === 'Enter' && savePassword()}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40" />
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <button onClick={savePassword} disabled={saving || !password || !confirmPassword}
              className="w-full py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 2: Gateway */}
        {step === 'gateway' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              {gwStatus === 'connected' ? <Wifi size={18} className="text-emerald-400" /> : gwStatus === 'checking' ? <Loader2 size={18} className="animate-spin text-[var(--primary)]" /> : <WifiOff size={18} className="text-red-400" />}
              <h2 className="text-lg font-semibold">Gateway Connection</h2>
            </div>

            {gwStatus === 'checking' && <p className="text-sm text-[var(--muted-foreground)]">Checking OpenClaw Gateway connection...</p>}
            {gwStatus === 'connected' && (
              <>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Gateway connected</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">OpenClaw is running and Studio is connected.</p>
                </div>
                <button onClick={finish}
                  className="w-full py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium flex items-center justify-center gap-2">
                  <CheckCircle size={14} /> Launch Studio
                </button>
              </>
            )}
            {gwStatus === 'failed' && (
              <>
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-sm text-red-400 font-medium">Gateway not reachable</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Make sure OpenClaw is running: <code className="bg-[var(--muted)] px-1 rounded">openclaw gateway start</code></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={checkGateway} className="flex-1 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--muted)]">Retry</button>
                  <button onClick={finish} className="flex-1 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium">Skip & Launch</button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <CheckCircle size={48} className="mx-auto text-emerald-400" />
            <h2 className="text-lg font-semibold">You're all set!</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Redirecting to Studio...</p>
          </div>
        )}
      </div>
    </div>
  )
}
