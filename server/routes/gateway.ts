import { Hono } from 'hono'
import { getGatewayClient, getGatewayStatus } from '../lib/gateway.js'

const gateway = new Hono()

gateway.get('/status', (c) => c.json(getGatewayStatus()))

gateway.post('/reconnect', (c) => {
  const client = getGatewayClient()
  client.disconnect()
  client.connect()
  return c.json({ ok: true, message: 'Reconnecting...' })
})

export default gateway
