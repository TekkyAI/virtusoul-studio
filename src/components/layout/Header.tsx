import { LogOut } from 'lucide-react'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  title: string
  user: { name: string }
}

export function Header({ title, user }: HeaderProps) {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.reload()
  }

  return (
    <header className="flex items-center justify-between h-12 px-6 border-b border-[var(--border)] bg-[var(--background)]">
      <h1 className="text-sm font-semibold text-[var(--foreground)]">{title}</h1>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">{user.name}</span>
          <button onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
