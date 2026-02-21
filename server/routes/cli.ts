import { Hono } from 'hono'
import { spawn } from 'child_process'
import { getGatewayClient } from '../lib/gateway.js'

const cli = new Hono()

// Commands that are safe to run from the GUI
const ALLOWED_PREFIXES = [
  'agents', 'agent', 'browser', 'channels', 'clawhub', 'models', 'memory', 'cron',
  'config', 'configure', 'gateway', 'health', 'status', 'sessions',
  'devices', 'doctor', 'approvals', 'skills', 'hooks', 'logs',
  'plugins', 'security', 'system', 'update',
]

// Commands that will kill the gateway WS — need special handling
const GATEWAY_LIFECYCLE = ['gateway start', 'gateway stop', 'gateway restart']

function isAllowed(args: string[]): boolean {
  if (!args.length) return false
  return ALLOWED_PREFIXES.includes(args[0])
}

function isGatewayLifecycle(args: string[]): boolean {
  const cmd = args.slice(0, 2).join(' ')
  return GATEWAY_LIFECYCLE.includes(cmd)
}

// POST /api/cli/exec — SSE streaming of openclaw command output
cli.post('/exec', async (c) => {
  const { command } = await c.req.json<{ command: string }>()
  if (!command?.trim()) return c.json({ error: 'No command provided' }, 400)

  // Parse: user sends "agents list --json" — we prepend "openclaw"
  const args = command.trim().split(/\s+/)
  if (!isAllowed(args)) return c.json({ error: `Command not allowed: ${args[0]}` }, 403)

  const isLifecycle = isGatewayLifecycle(args)
  const gw = getGatewayClient()

  return new Response(
    new ReadableStream({
      start(controller) {
        const enc = new TextEncoder()
        const send = (event: string, data: any) => {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        // If gateway lifecycle command, disconnect WS first
        if (isLifecycle && args[1] !== 'start') {
          send('info', { text: `⚠ Disconnecting gateway before ${args[1]}...` })
          gw.disconnect?.()
        }

        const child = spawn('openclaw', [...args, '--no-color'], {
          env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        child.stdout.on('data', (chunk: Buffer) => send('stdout', { text: chunk.toString() }))
        child.stderr.on('data', (chunk: Buffer) => send('stderr', { text: chunk.toString() }))

        child.on('close', (code) => {
          send('exit', { code })

          // Auto-reconnect gateway after lifecycle commands
          if (isLifecycle) {
            send('info', { text: '🔄 Reconnecting to gateway...' })
            setTimeout(() => {
              gw.connect?.()
              send('info', { text: '✅ Reconnect initiated' })
              controller.close()
            }, 2000)
          } else {
            controller.close()
          }
        })

        child.on('error', (err) => {
          send('error', { text: err.message })
          controller.close()
        })
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    }
  )
})

// GET /api/cli/run?cmd=... — simple JSON response (for quick commands)
cli.get('/run', async (c) => {
  const cmd = c.req.query('cmd') || ''
  const args = cmd.trim().split(/\s+/)
  if (!isAllowed(args)) return c.json({ error: `Command not allowed: ${args[0]}` }, 403)

  return new Promise((resolve) => {
    const child = spawn('openclaw', [...args, '--no-color', '--json'], {
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = '', stderr = ''
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()))
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    child.on('close', (code) => {
      try {
        resolve(c.json({ code, data: JSON.parse(stdout) }))
      } catch {
        resolve(c.json({ code, stdout: stdout.trim(), stderr: stderr.trim() }))
      }
    })
    child.on('error', (err) => resolve(c.json({ error: err.message }, 500)))
  })
})

export default cli
