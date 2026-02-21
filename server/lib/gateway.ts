import { GatewayClient } from './gateway-client.js'

let client: GatewayClient | null = null

export function getGatewayClient(): GatewayClient {
  if (!client) {
    const url = process.env.GATEWAY_URL || 'ws://localhost:18789'
    const token = process.env.GATEWAY_AUTH_TOKEN || ''
    client = new GatewayClient(url, token)
    client.connect()
  }
  return client
}

export function getGatewayStatus() {
  const c = client
  return {
    status: c?.status ?? 'disconnected',
    connected: c?.isConnected ?? false,
    uptimeMs: c?.uptime ?? 0,
    gatewayUrl: process.env.GATEWAY_URL || 'ws://localhost:18789',
  }
}
