export type ChatWSHandler = (msg: any) => void

export class ChatClient {
  private ws: WebSocket | null = null
  private handlers: ChatWSHandler[] = []
  private _connected = false

  connect() {
    if (this.ws) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.ws = new WebSocket(`${proto}//${location.host}/api/chat/stream`)

    this.ws.onopen = () => { this._connected = true; console.log('[chat-client] WS connected') }
    this.ws.onclose = () => { this._connected = false; this.ws = null; console.log('[chat-client] WS closed') }
    this.ws.onerror = (e) => { console.error('[chat-client] WS error', e) }
    this.ws.onmessage = (e) => {
      let msg: any
      try { msg = JSON.parse(e.data) } catch { return }
      for (const h of this.handlers) h(msg)
    }
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this._connected = false
  }

  onMessage(fn: ChatWSHandler) {
    this.handlers.push(fn)
    return () => { this.handlers = this.handlers.filter(h => h !== fn) }
  }

  send(data: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(data))
  }

  get connected() { return this._connected }
}
