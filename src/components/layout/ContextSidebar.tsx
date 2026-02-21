import { NavLink, useSearchParams, useLocation } from 'react-router-dom'
import { Activity, Coins, MonitorDot, ShieldAlert, Settings, Clock, Smartphone, Cpu, Terminal, Bookmark, Anchor, Globe, Server, Eye, Brain, Sparkles, LayoutDashboard, SlidersHorizontal, Plus, MessageSquare, Wifi, WifiOff, Bot, ChevronRight, ChevronDown, FileText, FolderOpen, Zap, Shield, Rocket, Heart, Star, Coffee, Flame, Gem, Swords, Crown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useGatewayStatus } from '@/hooks/useGatewayStatus'
import type { RailSection } from './RailBar'

const DASHBOARD_LINKS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/activity', icon: Activity, label: 'Activity' },
  { to: '/admin/tokens', icon: Coins, label: 'Token Usage' },
  { to: '/admin/sessions', icon: MonitorDot, label: 'Sessions' },
  { to: '/admin/approvals', icon: ShieldAlert, label: 'Approvals' },
  { to: '/admin/traces', icon: Eye, label: 'Observability' },
  { to: '/admin/memory', icon: Brain, label: 'Graph Memory' },
  { to: '/admin/memory-tuning', icon: SlidersHorizontal, label: 'Memory Tuning' },
]

const SETTINGS_LINKS = [
  { to: '/admin/config', icon: Settings, label: 'Config' },
  { to: '/admin/cron', icon: Clock, label: 'Cron Jobs' },
  { to: '/admin/devices', icon: Smartphone, label: 'Devices' },
  { to: '/admin/models', icon: Cpu, label: 'Models' },
  { to: '/admin/skills', icon: Sparkles, label: 'Skills' },
  { to: '/admin/hooks', icon: Anchor, label: 'Hooks' },
  { to: '/admin/browser', icon: Globe, label: 'Browser' },
  { to: '/admin/mcp', icon: Server, label: 'MCP Servers' },
  { to: '/admin/terminal', icon: Terminal, label: 'Terminal' },
]

const CHAT_LINKS = [
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
]

const HAS_SIDEBAR: RailSection[] = ['chat', 'agents', 'channels', 'dashboard', 'settings']

export function hasSidebar(section: RailSection) {
  return HAS_SIDEBAR.includes(section)
}

export function ContextSidebar({ section }: { section: RailSection }) {
  if (!HAS_SIDEBAR.includes(section)) return null

  return (
    <div className="w-56 border-r border-[var(--border)] bg-[var(--background)] flex flex-col shrink-0">
      <div className="h-12 px-3 flex items-center border-b border-[var(--border)]">
        <span className="text-sm font-bold tracking-tight">
          Virtu<span className="text-[var(--primary)]">Soul</span>
          <span className="text-[var(--muted-foreground)] font-normal text-[10px] ml-1">Studio v{__STUDIO_VERSION__}</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {section === 'dashboard' && <SubNav links={DASHBOARD_LINKS} />}
        {section === 'settings' && <SubNav links={SETTINGS_LINKS} />}
        {section === 'chat' && <ChatNav />}
        {section === 'agents' && <AgentList />}
        {section === 'channels' && <ChannelList />}
      </nav>
      <StatusFooter />
    </div>
  )
}

function StatusFooter() {
  const gw = useGatewayStatus()
  const [ocVersion, setOcVersion] = useState('')

  useEffect(() => {
    fetch('/api/admin/version').then(r => r.json()).then(d => setOcVersion(d.current || '')).catch(() => {})
  }, [])

  const gwStatus = gw?.status ?? 'disconnected'
  const gwConnected = gwStatus === 'connected'

  return (
    <div className="border-t border-[var(--border)] p-2 space-y-1.5">
      <div className="flex items-center justify-between px-1 text-[10px] text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1" title={`Gateway: ${gwStatus}`}>
          {gwConnected ? <Wifi size={11} className="text-emerald-400" /> : <WifiOff size={11} className="text-red-400" />}
          <span>{gwConnected ? 'Online' : 'Offline'}</span>
        </div>
        {ocVersion && <span title={`OpenClaw ${ocVersion}`}>OC {ocVersion}</span>}
      </div>
    </div>
  )
}

function SubNav({ links }: { links: { to: string; icon: any; label: string }[] }) {
  return (
    <>
      {links.map(item => (
        <NavLink key={item.to} to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'}`
          }>
          {item.icon && <item.icon size={14} />}
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

function ChatNav() {
  const [convos, setConvos] = useState<any[]>([])
  const [searchParams] = useSearchParams()
  const [editing, setEditing] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const activeSession = searchParams.get('s')

  const load = () => fetch('/api/conversations').then(r => r.json()).then(d => setConvos(d.conversations ?? [])).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('conversations-changed', h)
    return () => window.removeEventListener('conversations-changed', h)
  }, [])

  function timeLabel(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    if (diff < 86400000) return 'Today'
    if (diff < 172800000) return 'Yesterday'
    return `${Math.floor(diff / 86400000)}d ago`
  }

  async function rename(id: string) {
    if (!editTitle.trim()) { setEditing(null); return }
    await fetch(`/api/conversations/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    setEditing(null)
    load()
  }

  return (
    <>
      <NavLink to="/chat" end
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${isActive && !activeSession ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'}`
        }>
        <Plus size={14} /> New Chat
      </NavLink>
      <SubNav links={CHAT_LINKS} />
      {convos.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--border)]">
          <p className="px-2.5 pb-1 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Recent</p>
          {convos.map(c => (
            <div key={c.id} className="group relative">
              {editing === c.id ? (
                <div className="px-2 py-1">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus
                    onBlur={() => rename(c.id)} onKeyDown={e => { if (e.key === 'Enter') rename(c.id); if (e.key === 'Escape') setEditing(null) }}
                    className="w-full px-1.5 py-0.5 rounded text-xs bg-[var(--muted)] border border-[var(--border)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                </div>
              ) : (
                <NavLink to={`/chat?s=${c.sessionKey || c.id}`}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${activeSession === (c.sessionKey || c.id) ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'}`}
                  onDoubleClick={(e) => { e.preventDefault(); setEditing(c.id); setEditTitle(c.title) }}>
                  <MessageSquare size={12} className="shrink-0" />
                  <span className="truncate flex-1">{c.title}</span>
                  <span className="text-[9px] shrink-0 opacity-60">{timeLabel(c.updatedAt)}</span>
                </NavLink>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export const AGENT_ICONS: Record<string, any> = {
  Bot, Brain, Cpu, Zap, Shield, Rocket, Heart, Star, Coffee, Flame, Gem, Swords, Crown, Sparkles,
}

function getAgentIcon(id: string) {
  const saved = JSON.parse(localStorage.getItem('vs_agent_icons') || '{}')
  return AGENT_ICONS[saved[id]] || Bot
}

function AgentList() {
  const [agents, setAgents] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [agentFiles, setAgentFiles] = useState<Record<string, string[]>>({})
  const location = useLocation()

  const load = () => {
    fetch('/api/cli/run?cmd=agents%20list').then(r => r.json()).then(d => setAgents(d.data ?? [])).catch(() => {})
  }

  useEffect(() => { load() }, [])

  // Refresh when URL changes (after create/delete)
  useEffect(() => { load() }, [location.search])

  // Listen for manual refresh events
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('agents-changed', handler)
    return () => window.removeEventListener('agents-changed', handler)
  }, [])

  const toggle = async (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) { next.delete(id) } else {
      next.add(id)
      if (!agentFiles[id]) {
        // Load agent workspace files
        const res = await fetch(`/api/admin/workspace?path=/`).then(r => r.json()).catch(() => ({ files: [] }))
        setAgentFiles(prev => ({ ...prev, [id]: (res.files ?? []).filter((f: any) => f.name.endsWith('.md')).map((f: any) => f.name) }))
      }
    }
    setExpanded(next)
  }

  return (
    <>
      <NavLink to="/admin/agent-manager?new=1"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
        <Plus size={12} /> Add Agent
      </NavLink>
      {agents.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          {agents.map(a => {
            const Icon = getAgentIcon(a.id)
            const isOpen = expanded.has(a.id)
            const files = agentFiles[a.id] ?? []
            return (
              <div key={a.id} className="mb-1.5">
                <div className="flex items-center">
                  <button onClick={() => toggle(a.id)} className="p-0.5 text-[var(--muted-foreground)]">
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <NavLink to={`/admin/agent-manager?agent=${a.id}`}
                    className={({ isActive }) =>
                      `flex-1 flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[13px] transition-colors ${isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'text-[var(--foreground)] hover:bg-[var(--muted)]'}`
                    }>
                    <Icon size={14} />
                    <span className="font-medium">{a.id}</span>
                    {a.isDefault && <span className="text-[9px] px-1 rounded bg-[var(--primary)]/20 text-[var(--primary)]">default</span>}
                  </NavLink>
                </div>
                {isOpen && files.length > 0 && (
                  <div className="ml-5 border-l border-[var(--border)] pl-2">
                    {files.map(f => (
                      <NavLink key={f} to={`/admin/agent-manager?agent=${a.id}&file=${f}`}
                        className="flex items-center gap-1.5 py-1 px-1 rounded text-[11px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]">
                        <FileText size={10} /> {f}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const CHANNEL_EMOJI: Record<string, string> = {
  telegram: '✈️', whatsapp: '💬', discord: '🎮', slack: '💼',
  signal: '🔒', matrix: '🟢', irc: '💻', email: '📧',
}

function ChannelList() {
  const [channels, setChannels] = useState<Record<string, string[]>>({})
  useEffect(() => {
    fetch('/api/cli/run?cmd=channels%20list').then(r => r.json())
      .then(d => setChannels(d.data?.chat ?? {})).catch(() => {})
  }, [])

  const entries = Object.entries(channels)

  return (
    <>
      <NavLink to="/admin/channels"
        className={({ isActive }) =>
          `flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors ${isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'}`
        }>
        All Channels
      </NavLink>
      {entries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]">
          <p className="px-2.5 pb-1 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Active</p>
          {entries.map(([type, instances]) => (
            <div key={type}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted-foreground)]">
              <span>{CHANNEL_EMOJI[type] || '📡'}</span>
              <span className="capitalize">{type}</span>
              {instances.length > 1 && <span className="text-[10px] opacity-60">×{instances.length}</span>}
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          ))}
        </div>
      )}
    </>
  )
}
