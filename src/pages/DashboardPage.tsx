import { useState, useEffect } from 'react'
import { Activity, MessageSquare, Bot, Clock, Wifi, WifiOff } from 'lucide-react'
import { useGatewayStatus } from '@/hooks/useGatewayStatus'

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color ?? 'bg-[var(--primary)]/10'}`}>
          <Icon size={18} className="text-[var(--primary)]" />
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      {sub && <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const gw = useGatewayStatus(5000)
  const [stats, setStats] = useState({ conversations: 0, messages: 0, agents: 0 })

  useEffect(() => {
    // Fetch basic stats
    Promise.all([
      fetch('/api/conversations').then(r => r.json()).catch(() => ({ conversations: [] })),
      fetch('/api/agents').then(r => r.json()).catch(() => ({ agents: [] })),
    ]).then(([convData, agentData]) => {
      setStats({
        conversations: convData.conversations?.length ?? 0,
        messages: 0, // Would need a count endpoint
        agents: agentData.agents?.length ?? 0,
      })
    })
  }, [])

  const uptimeStr = gw?.uptimeMs
    ? `${Math.floor(gw.uptimeMs / 60000)}m ${Math.floor((gw.uptimeMs % 60000) / 1000)}s`
    : '—'

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={gw?.connected ? Wifi : WifiOff}
          label="Gateway"
          value={gw?.connected ? 'Connected' : 'Disconnected'}
          sub={gw?.connected ? `Uptime: ${uptimeStr}` : gw?.gatewayUrl}
          color={gw?.connected ? 'bg-green-500/10' : 'bg-[var(--destructive)]/10'}
        />
        <StatCard icon={MessageSquare} label="Conversations" value={String(stats.conversations)} />
        <StatCard icon={Bot} label="Agents" value={String(stats.agents)} />
        <StatCard icon={Clock} label="Uptime" value={uptimeStr} />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Gateway Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--muted-foreground)]">URL:</span>
            <span className="ml-2 font-mono text-xs">{gw?.gatewayUrl ?? '—'}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">Status:</span>
            <span className="ml-2">{gw?.status ?? 'unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
