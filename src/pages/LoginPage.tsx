import { useState, type FormEvent } from 'react'

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) { onLogin(); return }
      const data = await res.json()
      setError(data.error || 'Login failed')
    } catch { setError('Connection failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Virtu<span className="text-[var(--primary)]">Soul</span>
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Studio</p>
        </div>

        <div className="space-y-2">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Admin password" autoFocus
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 focus:border-[var(--ring)]" />
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        </div>

        <button type="submit" disabled={loading || !password}
          className="w-full py-2 px-4 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
