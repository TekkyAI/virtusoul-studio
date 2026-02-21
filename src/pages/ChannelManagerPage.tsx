import { useState, useEffect, useCallback } from 'react'
import { Radio, RefreshCw, Power, Settings2, LogIn, LogOut, Trash2, X, Info } from 'lucide-react'
import { useCliExec } from '../hooks/useCliExec'

type ChannelDef = {
  id: string
  pluginId: string
  label: string
  emoji: string
  method: 'token' | 'login' | 'credentials' | 'webhook' | 'cli' | 'plugin'
  hint: string
  fields: { key: string; label: string; type?: string; required?: boolean }[]
}

const CHANNELS: ChannelDef[] = [
  { id: 'telegram', pluginId: 'telegram', label: 'Telegram', emoji: '✈️', method: 'token',
    hint: 'Create a bot via @BotFather, paste the token.',
    fields: [{ key: 'token', label: 'Bot Token', required: true }] },
  { id: 'whatsapp', pluginId: 'whatsapp', label: 'WhatsApp', emoji: '💬', method: 'login',
    hint: 'Click Configure → scan QR code with your phone (Linked Devices).',
    fields: [] },
  { id: 'discord', pluginId: 'discord', label: 'Discord', emoji: '🎮', method: 'token',
    hint: 'Create a bot in Discord Dev Portal. Enable Message Content Intent.',
    fields: [{ key: 'token', label: 'Bot Token', required: true }] },
  { id: 'slack', pluginId: 'slack', label: 'Slack', emoji: '💼', method: 'token',
    hint: 'Create a Slack app with Socket Mode. Need both bot and app tokens.',
    fields: [{ key: 'bot-token', label: 'Bot Token (xoxb-...)', required: true }, { key: 'app-token', label: 'App Token (xapp-...)', required: true }] },
  { id: 'signal', pluginId: 'signal', label: 'Signal', emoji: '🔒', method: 'cli',
    hint: 'Requires signal-cli installed. Links as a secondary device.',
    fields: [{ key: 'signal-number', label: 'Phone Number (E.164)', required: true }, { key: 'cli-path', label: 'signal-cli Path' }] },
  { id: 'matrix', pluginId: 'matrix', label: 'Matrix', emoji: '🟩', method: 'credentials',
    hint: 'Provide homeserver URL + credentials (password or access token).',
    fields: [{ key: 'homeserver', label: 'Homeserver URL', required: true }, { key: 'user-id', label: 'User ID (@user:server)', required: true }, { key: 'password', label: 'Password', type: 'password' }, { key: 'access-token', label: 'Access Token (alt)' }] },
  { id: 'googlechat', pluginId: 'googlechat', label: 'Google Chat', emoji: '💚', method: 'webhook',
    hint: 'Set up a Google Chat webhook or service account.',
    fields: [{ key: 'webhook-url', label: 'Webhook URL' }, { key: 'audience', label: 'Audience' }] },
  { id: 'msteams', pluginId: 'msteams', label: 'MS Teams', emoji: '🟣', method: 'webhook',
    hint: 'Bot Framework webhook integration.',
    fields: [{ key: 'webhook-url', label: 'Webhook URL' }] },
  { id: 'mattermost', pluginId: 'mattermost', label: 'Mattermost', emoji: '🔵', method: 'token',
    hint: 'Create a bot account, provide token + server URL.',
    fields: [{ key: 'token', label: 'Bot Token', required: true }, { key: 'url', label: 'Server URL', required: true }] },
  { id: 'irc', pluginId: 'irc', label: 'IRC', emoji: '📡', method: 'token',
    hint: 'Connect to an IRC server.',
    fields: [{ key: 'url', label: 'Server URL', required: true }] },
  { id: 'bluebubbles', pluginId: 'bluebubbles', label: 'BlueBubbles', emoji: '🍎', method: 'webhook',
    hint: 'Requires BlueBubbles server on macOS for iMessage.',
    fields: [{ key: 'webhook-path', label: 'Webhook Path', required: true }] },
  { id: 'imessage', pluginId: 'imessage', label: 'iMessage', emoji: '💬', method: 'cli',
    hint: 'macOS only, legacy. BlueBubbles recommended.',
    fields: [{ key: 'cli-path', label: 'imsg CLI Path' }, { key: 'db-path', label: 'DB Path' }] },
  { id: 'feishu', pluginId: 'feishu', label: 'Feishu / Lark', emoji: '🐦', method: 'plugin',
    hint: 'WebSocket-based Feishu integration.',
    fields: [{ key: 'token', label: 'App Token' }] },
  { id: 'line', pluginId: 'line', label: 'LINE', emoji: '🟢', method: 'plugin',
    hint: 'LINE Messaging API.',
    fields: [{ key: 'token', label: 'Channel Access Token' }] },
  { id: 'nostr', pluginId: 'nostr', label: 'Nostr', emoji: '🟡', method: 'plugin',
    hint: 'NIP-04 encrypted DMs.',
    fields: [] },
  { id: 'nextcloud-talk', pluginId: 'nextcloud-talk', label: 'Nextcloud Talk', emoji: '☁️', method: 'plugin',
    hint: 'Self-hosted Nextcloud Talk.',
    fields: [{ key: 'url', label: 'Server URL' }, { key: 'token', label: 'Token' }] },
  { id: 'tlon', pluginId: 'tlon', label: 'Tlon (Urbit)', emoji: '⚫', method: 'credentials',
    hint: 'Provide ship name, URL, and login code.',
    fields: [{ key: 'ship', label: 'Ship (~sampel-palnet)', required: true }, { key: 'url', label: 'Ship URL', required: true }, { key: 'code', label: 'Login Code', required: true }] },
  { id: 'zalo', pluginId: 'zalo', label: 'Zalo', emoji: '🔷', method: 'plugin',
    hint: 'Zalo Bot API.',
    fields: [{ key: 'token', label: 'Bot Token' }] },
  { id: 'zalouser', pluginId: 'zalouser', label: 'Zalo Personal', emoji: '🔷', method: 'login',
    hint: 'Click Configure → scan QR code.',
    fields: [] },
  { id: 'twitch', pluginId: 'twitch', label: 'Twitch', emoji: '🟣', method: 'plugin',
    hint: 'Twitch IRC chat integration.',
    fields: [{ key: 'token', label: 'OAuth Token' }] },
]

export default function ChannelManagerPage() {
  const [plugins, setPlugins] = useState<Record<string, any>>({})
  const [channelStatus, setChannelStatus] = useState<Record<string, any>>({})
  const [configuredAccounts, setConfiguredAccounts] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const { run } = useCliExec()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pl, ch, st] = await Promise.all([
        run('plugins list'),
        run('channels list'),
        run('channels status'),
      ])
      const pluginMap: Record<string, any> = {}
      for (const p of (pl.data?.plugins ?? [])) pluginMap[p.id] = p
      setPlugins(pluginMap)
      setConfiguredAccounts(ch.data?.chat ?? {})
      setChannelStatus(st.data?.channels ?? {})
    } catch {} finally { setLoading(false) }
  }, [run])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Radio size={22} className="text-[var(--primary)]" /> Channels
        </h1>
        <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--muted)]">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {CHANNELS.map(ch => {
          const plugin = plugins[ch.pluginId]
          const enabled = plugin?.enabled ?? false
          const status = channelStatus[ch.id]
          const running = status?.running
          const accounts = configuredAccounts[ch.id]
          const configured = !!accounts

          return (
            <ChannelTile
              key={ch.id}
              def={ch}
              enabled={enabled}
              running={running}
              configured={configured}
              accounts={accounts}
              onToggle={load}
              onConfigure={() => setConfiguring(ch.id)}
            />
          )
        })}
      </div>

      {configuring && (
        <ConfigureModal
          def={CHANNELS.find(c => c.id === configuring)!}
          onClose={() => setConfiguring(null)}
          onDone={() => { setConfiguring(null); load() }}
        />
      )}
    </div>
  )
}

function ChannelTile({ def, enabled, running, configured, accounts, onToggle, onConfigure }: {
  def: ChannelDef; enabled: boolean; running: boolean; configured: boolean; accounts?: string[]; onToggle: () => void; onConfigure: () => void
}) {
  const { exec, running: busy } = useCliExec()

  const toggle = async () => {
    await exec(`plugins ${enabled ? 'disable' : 'enable'} ${def.pluginId}`, { onDone: () => setTimeout(onToggle, 500) })
  }

  return (
    <div className={`rounded-xl border p-2.5 text-center transition-colors ${enabled ? 'border-[var(--border)] bg-[var(--card)]' : 'border-[var(--border)]/50 bg-[var(--card)]/30 opacity-50'}`}>
      <div className="text-2xl mb-1">{def.emoji}</div>
      <p className="text-[11px] font-medium truncate">{def.label}</p>
      <div className="h-3 flex items-center justify-center">
        {running && <span className="flex items-center gap-1 text-[9px] text-emerald-400"><span className="w-1 h-1 rounded-full bg-emerald-400" />Online</span>}
        {enabled && !running && configured && <span className="text-[9px] text-amber-400">Ready</span>}
      </div>
      <div className="flex gap-1 mt-1.5">
        <button onClick={toggle} disabled={busy} title={enabled ? 'Disable' : 'Enable'}
          className={`flex-1 py-1 rounded text-[10px] ${enabled ? 'bg-emerald-400/10 text-emerald-400' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'}`}>
          <Power size={10} className="inline" />
        </button>
        {enabled && (
          <button onClick={onConfigure} className="flex-1 py-1 rounded text-[10px] bg-[var(--muted)] hover:bg-[var(--primary)]/20">
            <Settings2 size={10} className="inline" />
          </button>
        )}
      </div>
    </div>
  )
}

function ConfigureModal({ def, onClose, onDone }: { def: ChannelDef; onClose: () => void; onDone: () => void }) {
  const [fields, setFields] = useState<Record<string, string>>({})
  const { exec, running, output, setOutput } = useCliExec()

  const connect = async () => {
    setOutput('')
    if (def.method === 'login') {
      await exec(`channels login --channel ${def.id}`, { onDone: (c) => { if (c === 0) onDone() } })
    } else {
      let cmd = `channels add --channel ${def.id}`
      for (const [k, v] of Object.entries(fields)) {
        if (v.trim()) cmd += ` --${k} "${v.trim()}"`
      }
      await exec(cmd, { onDone: (c) => { if (c === 0) onDone() } })
    }
  }

  const disconnect = async () => {
    setOutput('')
    await exec(`channels remove --channel ${def.id}`, { onDone: (c) => { if (c === 0) onDone() } })
  }

  const login = async () => {
    setOutput('')
    await exec(`channels login --channel ${def.id}`, { onDone: () => {} })
  }

  const logout = async () => {
    setOutput('')
    await exec(`channels logout --channel ${def.id}`, { onDone: () => {} })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-[520px] max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{def.emoji}</span>
            <h3 className="font-medium">{def.label}</h3>
          </div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--muted)]/50 text-xs">
            <Info size={12} className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
            <p className="text-[var(--muted-foreground)]">{def.hint}</p>
          </div>

          {def.method === 'login' ? (
            <div className="space-y-2">
              <button onClick={connect} disabled={running}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">
                <LogIn size={14} /> {running ? 'Connecting...' : 'Start QR Pairing'}
              </button>
              <div className="flex gap-2">
                <button onClick={logout} disabled={running} className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">Logout</button>
                <button onClick={disconnect} disabled={running} className="flex-1 py-1.5 rounded-lg border border-red-400/30 text-xs text-red-400 hover:bg-red-400/10">Remove</button>
              </div>
            </div>
          ) : (
            <>
              {def.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-[var(--muted-foreground)] mb-1 block">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <input type={f.type || 'text'} value={fields[f.key] || ''} onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--muted)] text-sm" />
                </div>
              ))}
              <button onClick={connect} disabled={running}
                className="w-full py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium disabled:opacity-50">
                {running ? 'Connecting...' : 'Connect'}
              </button>
              <div className="flex gap-2">
                <button onClick={logout} disabled={running} className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:bg-[var(--muted)]">Logout</button>
                <button onClick={disconnect} disabled={running} className="flex-1 py-1.5 rounded-lg border border-red-400/30 text-xs text-red-400 hover:bg-red-400/10">Remove</button>
              </div>
            </>
          )}

          {output && <pre className="text-xs bg-[var(--muted)] rounded-lg p-3 max-h-60 overflow-auto whitespace-pre-wrap font-mono leading-none">{output}</pre>}
        </div>
      </div>
    </div>
  )
}
