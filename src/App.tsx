import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SetupWizard from './pages/SetupWizard'
import ChatPage from './pages/ChatPage'
import BookmarksPage from './pages/BookmarksPage'
import DashboardPage from './pages/DashboardPage'
import AgentsPage from './pages/AgentsPage'
import SessionsPage from './pages/SessionsPage'
import CronPage from './pages/CronPage'
import ConfigPage from './pages/ConfigPage'
import ApprovalsPage from './pages/ApprovalsPage'
import ActivityPage from './pages/ActivityPage'
import TokenUsagePage from './pages/TokenUsagePage'
import MissionControlPage from './pages/MissionControlPage'
import DevicePairingPage from './pages/DevicePairingPage'
import WorkspacePage from './pages/WorkspacePage'
import AgentManagerPage from './pages/AgentManagerPage'
import ChannelManagerPage from './pages/ChannelManagerPage'
import ModelManagerPage from './pages/ModelManagerPage'
import WebTerminalPage from './pages/WebTerminalPage'
import HooksManagerPage from './pages/HooksManagerPage'
import BrowserManagerPage from './pages/BrowserManagerPage'
import McpManagerPage from './pages/McpManagerPage'
import ObservabilityPage from './pages/ObservabilityPage'
import GraphMemoryPage from './pages/GraphMemoryPage'
import MemoryTuningPage from './pages/MemoryTuningPage'
import SkillsManagerPage from './pages/SkillsManagerPage'
import { AppShell } from './components/layout/AppShell'

type User = { id: string; name: string; email: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/auth/setup-status').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([me, setup]) => {
      if (me?.user) setUser(me.user)
      if (setup?.needsSetup) setNeedsSetup(true)
      setChecking(false)
    })
  }, [])

  if (checking) return <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)] text-sm">Loading…</div>
  if (needsSetup) return <SetupWizard onComplete={() => window.location.reload()} />
  if (!user) return <LoginPage onLogin={() => window.location.reload()} />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell user={user} />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/mission-control" element={<MissionControlPage />} />
          <Route path="/admin/agents" element={<AgentsPage />} />
          <Route path="/admin/agent-manager" element={<AgentManagerPage />} />
          <Route path="/admin/channels" element={<ChannelManagerPage />} />
          <Route path="/admin/models" element={<ModelManagerPage />} />
          <Route path="/admin/sessions" element={<SessionsPage />} />
          <Route path="/admin/approvals" element={<ApprovalsPage />} />
          <Route path="/admin/activity" element={<ActivityPage />} />
          <Route path="/admin/tokens" element={<TokenUsagePage />} />
          <Route path="/admin/cron" element={<CronPage />} />
          <Route path="/admin/devices" element={<DevicePairingPage />} />
          <Route path="/admin/workspace" element={<WorkspacePage />} />
          <Route path="/admin/config" element={<ConfigPage />} />
          <Route path="/admin/terminal" element={<WebTerminalPage />} />
          <Route path="/admin/hooks" element={<HooksManagerPage />} />
          <Route path="/admin/browser" element={<BrowserManagerPage />} />
          <Route path="/admin/mcp" element={<McpManagerPage />} />
          <Route path="/admin/traces" element={<ObservabilityPage />} />
          <Route path="/admin/memory" element={<GraphMemoryPage />} />
          <Route path="/admin/memory-tuning" element={<MemoryTuningPage />} />
          <Route path="/admin/skills" element={<SkillsManagerPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
