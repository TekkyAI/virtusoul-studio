import { Hono } from 'hono'
import { getGatewayClient } from '../lib/gateway.js'

const agents = new Hono()

agents.get('/', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ agents: [] })
  try {
    const res = await gw.request('agents.list', {})
    return c.json({ agents: (res as any).agents ?? [] })
  } catch {
    return c.json({ agents: [] })
  }
})

agents.get('/:id', async (c) => {
  const gw = getGatewayClient()
  if (!gw.isConnected) return c.json({ error: 'Gateway not connected' }, 503)
  try {
    const res = await gw.request('agents.get', { agentId: c.req.param('id') })
    return c.json(res)
  } catch (err: any) {
    return c.json({ error: err.message ?? 'Failed' }, 500)
  }
})

export default agents
