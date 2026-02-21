import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { RailBar, getActiveSection, type RailSection } from './RailBar'
import { ContextSidebar, hasSidebar } from './ContextSidebar'
import { Header } from './Header'
import { SearchDialog } from '../search/SearchDialog'
import { pushNotification } from './NotificationBell'
import { ChatClient } from '@/lib/chat-client'

let _notifClient: ChatClient | null = null

const pageTitles: Record<string, string> = {
  '/chat': 'Chat Playground',
  '/bookmarks': 'Bookmarks',
  '/admin/dashboard': 'Dashboard',
  '/admin/mission-control': 'Mission Control',
  '/admin/agents': 'Agents',
  '/admin/agent-manager': 'Agent Manager',
  '/admin/channels': 'Channels',
  '/admin/models': 'Models',
  '/admin/sessions': 'Sessions',
  '/admin/approvals': 'Approvals',
  '/admin/activity': 'Activity',
  '/admin/tokens': 'Token Usage',
  '/admin/cron': 'Cron Jobs',
  '/admin/devices': 'Devices',
  '/admin/workspace': 'Workspace',
  '/admin/config': 'Configuration',
  '/admin/terminal': 'Terminal',
  '/admin/hooks': 'Hooks',
  '/admin/browser': 'Browser',
  '/admin/mcp': 'MCP Servers',
  '/admin/traces': 'Observability',
  '/admin/memory': 'Graph Memory',
  '/admin/memory-tuning': 'Memory Tuning',
  '/admin/skills': 'Skills',
}

interface AppShellProps {
  user: { id: string; name: string; email: string }
}

export function AppShell({ user }: AppShellProps) {
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [section, setSection] = useState<RailSection>(() => getActiveSection(location.pathname))
  const title = pageTitles[location.pathname] || 'VirtuSoul'

  // Sync section with route changes
  useEffect(() => {
    setSection(getActiveSection(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Feed WS events into notification bell
  useEffect(() => {
    if (!_notifClient) { _notifClient = new ChatClient(); _notifClient.connect() }
    return _notifClient.onMessage((msg: any) => {
      if (msg.event === 'exec.approval.requested')
        pushNotification({ type: 'approval', text: `Approval needed: ${msg.payload?.command || 'exec tool call'}` })
      else if (msg.event === 'agent.error' || msg.event === 'error')
        pushNotification({ type: 'error', text: msg.payload?.message || msg.payload?.error || 'Agent error' })
      else if (msg.event === 'agent.lifecycle' && msg.payload?.state === 'done')
        pushNotification({ type: 'info', text: `Agent completed task` })
      else if (msg.event === 'cron.run')
        pushNotification({ type: 'info', text: `Cron job ran: ${msg.payload?.name || msg.payload?.id || 'unknown'}` })
    })
  }, [])

  const showSidebar = hasSidebar(section)

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <RailBar active={section} onSelect={setSection} />
      {showSidebar && <ContextSidebar section={section} />}
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} user={user} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
