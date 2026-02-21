import { useState, useEffect, useRef } from 'react'
import { Bell, ShieldAlert, CheckCircle, AlertTriangle, X } from 'lucide-react'

export type Notification = { id: string; type: 'approval' | 'error' | 'info'; text: string; time: number }

// Global notification store — fed from WS events
let _notifications: Notification[] = []
let _listeners: (() => void)[] = []

export function pushNotification(n: Omit<Notification, 'id' | 'time'>) {
  _notifications = [{ ...n, id: crypto.randomUUID(), time: Date.now() }, ..._notifications.slice(0, 49)]
  _listeners.forEach(l => l())
}

function useNotifications() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const l = () => rerender(c => c + 1)
    _listeners.push(l)
    return () => { _listeners = _listeners.filter(x => x !== l) }
  }, [])
  return _notifications
}

export function NotificationBell() {
  const notifications = useNotifications()
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const unread = notifications.length - seen

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = () => {
    setOpen(o => !o)
    if (!open) setSeen(notifications.length)
  }

  const clear = () => { _notifications = []; _listeners.forEach(l => l()); setSeen(0) }

  const icons = { approval: ShieldAlert, error: AlertTriangle, info: CheckCircle }
  const colors = { approval: 'text-amber-400', error: 'text-red-400', info: 'text-emerald-400' }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-96 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50">
          <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-xs font-medium">Notifications</span>
            {notifications.length > 0 && <button onClick={clear} className="text-[10px] text-[var(--muted-foreground)] hover:underline">Clear all</button>}
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] text-center py-6">No notifications</p>
          ) : notifications.map(n => {
            const Icon = icons[n.type]
            return (
              <div key={n.id} className="px-3 py-2.5 border-b border-[var(--border)] last:border-0 flex items-start gap-2">
                <Icon size={14} className={`mt-0.5 shrink-0 ${colors[n.type]}`} />
                <div className="min-w-0">
                  <p className="text-xs">{n.text}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{timeAgo(n.time)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}
