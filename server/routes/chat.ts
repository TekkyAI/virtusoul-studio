import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { verifySessionToken, SESSION_COOKIE } from '../lib/auth.js'
import { getGatewayClient } from '../lib/gateway.js'
import { getCookie } from 'hono/cookie'
import crypto from 'crypto'

let _injectWebSocket: (server: any) => void

export function setupChatWebSocket(app: Hono) {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app: app as any })
  _injectWebSocket = injectWebSocket

  app.get(
    '/api/chat/stream',
    upgradeWebSocket((c) => {
      const token = getCookie(c, SESSION_COOKIE)
      const userId = token ? verifySessionToken(token) : null
      let eventUnsub: (() => void) | null = null

      return {
        onOpen(_evt, ws) {
          if (!userId) {
            ws.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }))
            ws.close(4001, 'Unauthorized')
            return
          }
          console.log(`[chat-ws] Client connected: ${userId}`)

          // Single event listener per WS connection
          const gw = getGatewayClient()
          eventUnsub = gw.onEvent((event, payload: any) => {
            if (event !== 'agent' && event !== 'chat' && event !== 'exec.approval.requested' && event !== 'exec.approval.resolved') return
            ws.send(JSON.stringify({ type: event, payload }))
          })
        },

        onMessage(evt, ws) {
          if (!userId) return
          let msg: any
          try { msg = JSON.parse(typeof evt.data === 'string' ? evt.data : evt.data.toString()) } catch { return }

          const gw = getGatewayClient()
          if (!gw.isConnected) {
            ws.send(JSON.stringify({ type: 'error', error: 'Gateway not connected' }))
            return
          }

          switch (msg.type) {
            case 'send': handleSend(gw, ws, msg); break
            case 'abort': handleAbort(gw, ws, msg); break
            case 'history': handleHistory(gw, ws, msg); break
            case 'sessions': handleSessions(gw, ws); break
          }
        },

        onClose() {
          console.log(`[chat-ws] Client disconnected: ${userId}`)
          if (eventUnsub) { eventUnsub(); eventUnsub = null }
        },
      }
    })
  )
}

export function injectWebSocket(server: any) {
  _injectWebSocket(server)
}

async function handleSend(gw: ReturnType<typeof getGatewayClient>, ws: any, msg: any) {
  const idempotencyKey = crypto.randomUUID()
  try {
    const attachments: any[] = []
    const fileRefs: string[] = []

    // Separate images (sent as attachments) from other files (saved to workspace)
    for (const att of (msg.attachments ?? [])) {
      if (att.mimeType?.startsWith('image/')) {
        attachments.push({ fileName: att.fileName, mimeType: att.mimeType, content: att.content })
      } else {
        // Write non-image files to workspace and reference in message
        try {
          const uploadsDir = path.join(os.homedir(), '.openclaw', 'workspace', 'uploads')
          fs.mkdirSync(uploadsDir, { recursive: true })
          const buf = Buffer.from(att.content, 'base64')
          fs.writeFileSync(path.join(uploadsDir, att.fileName), buf)
          fileRefs.push(att.fileName)
        } catch (e: any) { fileRefs.push(`${att.fileName} (upload failed: ${e.message})`) }
      }
    }

    let message = msg.message || ''
    if (fileRefs.length) message += `\n\n[Files uploaded to workspace: ${fileRefs.map(f => `uploads/${f}`).join(', ')}. Read them with your file tools.]`

    const res = await gw.request('chat.send', {
      sessionKey: msg.sessionKey,
      message,
      deliver: false,
      idempotencyKey,
      ...(attachments.length ? { attachments } : {}),
    })
    ws.send(JSON.stringify({ type: 'send-ack', payload: res }))
  } catch (err: any) {
    console.error('[chat-ws] send error:', err)
    ws.send(JSON.stringify({ type: 'error', error: err.message ?? String(err) }))
  }
}

async function handleAbort(gw: ReturnType<typeof getGatewayClient>, ws: any, msg: any) {
  try {
    const res = await gw.request('chat.abort', { sessionKey: msg.sessionKey })
    ws.send(JSON.stringify({ type: 'abort-ack', payload: res }))
  } catch (err: any) {
    ws.send(JSON.stringify({ type: 'error', error: err.message ?? String(err) }))
  }
}

async function handleHistory(gw: ReturnType<typeof getGatewayClient>, ws: any, msg: any) {
  try {
    const res = await gw.request('chat.history', { sessionKey: msg.sessionKey, limit: msg.limit ?? 100 })
    ws.send(JSON.stringify({ type: 'history', payload: res }))
  } catch (err: any) {
    ws.send(JSON.stringify({ type: 'error', error: err.message ?? String(err) }))
  }
}

async function handleSessions(gw: ReturnType<typeof getGatewayClient>, ws: any) {
  try {
    const res = await gw.request('sessions.list', {})
    ws.send(JSON.stringify({ type: 'sessions', payload: res }))
  } catch (err: any) {
    ws.send(JSON.stringify({ type: 'error', error: err.message ?? String(err) }))
  }
}
