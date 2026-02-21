import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  LayoutDashboard,
  Bot,
  Settings,
  Clock,
  MonitorDot,
  PanelLeftClose,
  PanelLeft,
  Bookmark,
  ShieldAlert,
  Activity,
  Coins,
  Shield,
  Smartphone,
  FolderOpen,
  Radio,
  Cpu,
  Terminal,
  Wrench,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Chat',
    items: [
      { to: '/chat', icon: MessageSquare, label: 'Playground' },
      { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/mission-control', icon: Shield, label: 'Mission Control' },
      { to: '/admin/approvals', icon: ShieldAlert, label: 'Approvals' },
      { to: '/admin/activity', icon: Activity, label: 'Activity' },
      { to: '/admin/tokens', icon: Coins, label: 'Token Usage' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/admin/agent-manager', icon: Wrench, label: 'Agent Manager' },
      { to: '/admin/channels', icon: Radio, label: 'Channels' },
      { to: '/admin/models', icon: Cpu, label: 'Models' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/agents', icon: Bot, label: 'Agents' },
      { to: '/admin/sessions', icon: MonitorDot, label: 'Sessions' },
      { to: '/admin/cron', icon: Clock, label: 'Cron Jobs' },
      { to: '/admin/devices', icon: Smartphone, label: 'Devices' },
      { to: '/admin/workspace', icon: FolderOpen, label: 'Workspace' },
      { to: '/admin/config', icon: Settings, label: 'Config' },
      { to: '/admin/terminal', icon: Terminal, label: 'Terminal' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-[var(--border)] bg-[var(--background)] transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="VirtuSoul" className="w-6 h-6" />
            <span className="text-base font-bold tracking-tight">
              Virtu<span className="text-[var(--primary)]">Soul</span>
              <span className="text-[var(--muted-foreground)] font-normal text-xs ml-1">Studio</span>
            </span>
          </div>
        )}
        {collapsed && (
          <img src="/logo.svg" alt="VirtuSoul" className="w-6 h-6" />
        )}
        <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-[var(--muted)] text-[var(--muted-foreground)]">
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                      collapsed && 'justify-center px-0'
                    )
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={18} />
                  {!collapsed && item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Version */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--muted-foreground)]">v0.1.0</p>
        </div>
      )}
    </aside>
  )
}
