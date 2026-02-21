import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server'
import { createServer as createHTTPS } from 'node:https'
import { readFileSync, existsSync } from 'node:fs'
import 'dotenv/config'
import auth, { ensureAdminUser } from './routes/auth.js'
import gateway from './routes/gateway.js'
import { setupChatWebSocket, injectWebSocket } from './routes/chat.js'
import conversations from './routes/conversations.js'
import agents from './routes/agents.js'
import bookmarksRoute from './routes/bookmarks.js'
import searchRoute from './routes/search.js'
import foldersRoute from './routes/folders.js'
import admin from './routes/admin.js'
import cli from './routes/cli.js'
import mcp from './routes/mcp.js'
import voice from './routes/voice.js'
import observability, { traceMiddleware } from './routes/observability.js'
import memoryRoutes from './routes/memory.js'
import { getGatewayClient } from './lib/gateway.js'

const app = new Hono()
app.use('/api/*', cors())
app.use('/api/*', traceMiddleware)

app.get('/api/health', (c) =>
  c.json({ status: 'ok', name: 'virtusoul-studio', timestamp: new Date().toISOString() })
)

app.route('/api/auth', auth)
app.route('/api/gateway', gateway)
setupChatWebSocket(app)
app.route('/api/conversations', conversations)
app.route('/api/agents', agents)
app.route('/api/bookmarks', bookmarksRoute)
app.route('/api/search', searchRoute)
app.route('/api/folders', foldersRoute)
app.route('/api/admin', admin)
app.route('/api/cli', cli)
app.route('/api/mcp', mcp)
app.route('/api/voice', voice)
app.route('/api/traces', observability)
app.route('/api/memory', memoryRoutes)

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ root: './dist', path: 'index.html' }))
}

const port = Number(process.env.API_PORT ?? 5181)
const ssl = process.env.SSL_CERT && process.env.SSL_KEY &&
  existsSync(process.env.SSL_CERT) && existsSync(process.env.SSL_KEY)

const server = serve({
  fetch: app.fetch,
  hostname: '0.0.0.0',
  port,
  ...(ssl ? {
    createServer: createHTTPS,
    serverOptions: {
      cert: readFileSync(process.env.SSL_CERT!),
      key: readFileSync(process.env.SSL_KEY!),
    },
  } : {}),
})
injectWebSocket(server)

const proto = ssl ? 'https' : 'http'
console.log(`[api] VirtuSoul Studio running on ${proto}://localhost:${port}`)

ensureAdminUser().catch(() => {})
getGatewayClient()
