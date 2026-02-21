import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Bot, Radio, FolderOpen, LayoutDashboard, Settings, Shield } from 'lucide-react'

const RAIL_ITEMS = [
  { id: 'chat', icon: MessageSquare, label: 'Chat', path: '/chat' },
  { id: 'agents', icon: Bot, label: 'Agents', path: '/admin/agent-manager' },
  { id: 'channels', icon: Radio, label: 'Channels', path: '/admin/channels' },
  { id: 'workspace', icon: FolderOpen, label: 'Workspace', path: '/admin/workspace' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin/activity' },
]

const RAIL_BOTTOM = [
  { id: 'settings', icon: Settings, label: 'Settings', path: '/admin/config' },
  { id: 'mission', icon: Shield, label: 'Mission Control', path: '/admin/mission-control' },
]

export type RailSection = typeof RAIL_ITEMS[number]['id'] | typeof RAIL_BOTTOM[number]['id']

// Map routes to rail sections
const ROUTE_TO_SECTION: Record<string, RailSection> = {
  '/chat': 'chat', '/bookmarks': 'chat',
  '/admin/agent-manager': 'agents', '/admin/agents': 'agents',
  '/admin/channels': 'channels',
  '/admin/workspace': 'workspace',
  '/admin/dashboard': 'dashboard', '/admin/activity': 'dashboard', '/admin/tokens': 'dashboard', '/admin/sessions': 'dashboard', '/admin/approvals': 'dashboard', '/admin/traces': 'dashboard', '/admin/memory': 'dashboard', '/admin/memory-tuning': 'dashboard',
  '/admin/config': 'settings', '/admin/cron': 'settings', '/admin/devices': 'settings', '/admin/models': 'settings', '/admin/terminal': 'settings', '/admin/hooks': 'settings', '/admin/browser': 'settings', '/admin/mcp': 'settings', '/admin/skills': 'settings',
  '/admin/mission-control': 'mission',
}

export function getActiveSection(pathname: string): RailSection {
  return ROUTE_TO_SECTION[pathname] || 'chat'
}

export function RailBar({ active, onSelect }: { active: RailSection; onSelect: (s: RailSection) => void }) {
  const navigate = useNavigate()

  const handleClick = (item: typeof RAIL_ITEMS[number]) => {
    onSelect(item.id as RailSection)
    navigate(item.path)
  }

  return (
    <div className="w-12 flex flex-col items-center border-r border-[var(--border)] bg-[var(--background)] shrink-0">
      <div className="h-12 flex items-center justify-center">
        <img src="/logo.svg" alt="VS" className="w-6 h-6" />
      </div>

      <div className="flex-1 flex flex-col gap-1 pt-3 px-1.5">
        {RAIL_ITEMS.map(item => (
          <button key={item.id} onClick={() => handleClick(item)} title={item.label}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${active === item.id ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'}`}>
            <item.icon size={18} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1 pb-3 px-1.5">
        {RAIL_BOTTOM.map(item => (
          <button key={item.id} onClick={() => handleClick(item)} title={item.label}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${active === item.id ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'}`}>
            <item.icon size={18} />
          </button>
        ))}
      </div>
    </div>
  )
}
