import WebSocket from 'ws'
import crypto from 'crypto'
import { getOrCreateDeviceIdentity, buildDeviceAuthPayload, signPayload } from './device-identity.js'

export type GatewayStatus = 'disconnected' | 'connecting' | 'connected'
export type EventHandler = (event: string, payload: Record<string, unknown>) => void

interface PendingRequest {
  resolve: (v: Record<string, unknown>) => void
  reject: (e: unknown) => void
  timer: ReturnType<typeof setTimeout>
}

export class GatewayClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private eventHandlers: EventHandler[] = []
  private statusHandlers: ((s: GatewayStatus) => void)[] = []
  private _status: GatewayStatus = 'disconnected'
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private autoReconnect = true
  private connectedAt: number | null = null
  private connectNonce: string | null = null

  constructor(
    private url: string,
    private authToken: string,
  ) {}

  get status() { return this._status }
  get uptime() { return this.connectedAt ? Date.now() - this.connectedAt : 0 }

  private setStatus(s: GatewayStatus) {
    this._status = s
    for (const h of this.statusHandlers) h(s)
  }

  onStatus(fn: (s: GatewayStatus) => void) {
    this.statusHandlers.push(fn)
    return () => { this.statusHandlers = this.statusHandlers.filter(h => h !== fn) }
  }

  onEvent(fn: EventHandler) {
    this.eventHandlers.push(fn)
    return () => { this.eventHandlers = this.eventHandlers.filter(h => h !== fn) }
  }

  connect() {
    if (this.ws) return
    this.autoReconnect = true
    this.connectNonce = null
    this.setStatus('connecting')
    console.log(`[gateway] Connecting to ${this.url}`)

    this.ws = new WebSocket(this.url, { maxPayload: 25 * 1024 * 1024, origin: 'http://localhost:18789' })

    this.ws.on('open', () => console.log('[gateway] WS open'))

    this.ws.on('message', (raw) => {
      let msg: any
      try { msg = JSON.parse(raw.toString()) } catch { return }

      if (msg.type === 'event') {
        if (msg.event === 'connect.challenge') {
          const payload = msg.payload as Record<string, unknown> | undefined
          this.connectNonce = (payload && typeof payload.nonce === 'string') ? payload.nonce : null
          this.handleChallenge()
        } else {
          for (const h of this.eventHandlers) h(msg.event, msg.payload ?? {})
        }
      } else if (msg.type === 'res' && msg.id) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          clearTimeout(p.timer)
          if (msg.ok) p.resolve(msg.payload ?? {})
          else p.reject(msg.payload ?? msg.error ?? 'unknown error')
        }
      }
    })

    this.ws.on('close', (code, reason) => {
      console.log(`[gateway] WS closed: ${code} ${reason}`)
      this.cleanup()
      if (this.autoReconnect) this.scheduleReconnect()
    })

    this.ws.on('error', (err) => console.error('[gateway] WS error:', err.message))
  }

  private async handleChallenge() {
    const role = 'operator'
    const scopes = ['operator.read', 'operator.write', 'operator.admin']
    const signedAtMs = Date.now()
    const nonce = this.connectNonce ?? undefined

    // Build device identity for signed connect
    let device: Record<string, unknown> | undefined
    try {
      const identity = getOrCreateDeviceIdentity()
      const payload = buildDeviceAuthPayload({
        deviceId: identity.id,
        clientId: 'webchat',
        clientMode: 'webchat',
        role,
        scopes,
        signedAtMs,
        token: this.authToken || null,
        nonce,
      })
      const signature = signPayload(identity.privateKeyPem, payload)
      device = {
        id: identity.id,
        publicKey: identity.publicKeyRaw,
        signature,
        signedAt: signedAtMs,
        nonce,
      }
    } catch (err) {
      console.warn('[gateway] Failed to create device identity, connecting without it:', err)
    }

    try {
      const res = await this.request('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: { id: 'webchat', version: '0.1.0', platform: 'web', mode: 'webchat' },
        role,
        scopes,
        caps: [],
        commands: [],
        permissions: {},
        auth: { token: this.authToken },
        device,
        locale: 'en',
        userAgent: 'virtusoul-studio/0.1.0',
      })
      this.setStatus('connected')
      this.connectedAt = Date.now()
      this.reconnectAttempts = 0
      console.log('[gateway] Connected!')
    } catch (err: any) {
      console.error('[gateway] Connect handshake failed:', err)
      // If NOT_PAIRED, keep connection open for approval
      if (err?.code === 'NOT_PAIRED') {
        console.log('[gateway] Device not paired — approve via: openclaw devices approve <requestId>')
        return
      }
      this.autoReconnect = false
      this.disconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    const base = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    const delay = base + Math.random() * base * 0.3
    this.reconnectAttempts++
    console.log(`[gateway] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private cleanup() {
    this.ws = null
    this.connectedAt = null
    this.setStatus('disconnected')
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error('disconnected')) }
    this.pending.clear()
  }

  disconnect() {
    this.autoReconnect = false
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.ws) { this.ws.close(); this.ws = null }
    this.cleanup()
  }

  request(method: string, params: Record<string, unknown>, timeoutMs = 30000): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return reject(new Error('not connected'))
      const id = crypto.randomUUID()
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('timeout')) }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.ws.send(JSON.stringify({ type: 'req', id, method, params }))
    })
  }

  get isConnected() { return this._status === 'connected' }
}
