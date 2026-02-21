#!/usr/bin/env node
import { execSync, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')

const G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m', R = '\x1b[31m', N = '\x1b[0m'

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function check(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore' }); return true } catch { return false }
}

async function main() {
  console.log(`${C}
  ╔═══════════════════════════════════╗
  ║     OpenClaw Studio Installer     ║
  ╚═══════════════════════════════════╝
${N}`)

  // Prerequisites
  if (!check('openclaw')) {
    console.log(`${R}OpenClaw is not installed.${N}`)
    console.log(`Install it first:  ${C}curl -fsSL https://openclaw.ai/install.sh | bash${N}`)
    process.exit(1)
  }
  if (!check('docker')) {
    console.log(`${R}Docker is not installed.${N}`)
    console.log(`Install it:  ${C}curl -fsSL https://get.docker.com | sh${N}`)
    process.exit(1)
  }

  const dest = join(process.cwd(), 'openclaw-studio')

  if (existsSync(dest)) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const ans = await rl.question(`${Y}${dest} already exists. Overwrite? (y/N) ${N}`)
    rl.close()
    if (ans.toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0) }
    run(`rm -rf "${dest}"`)
  }

  // Copy package files
  console.log(`${C}Setting up OpenClaw Studio...${N}`)
  mkdirSync(dest, { recursive: true })
  for (const item of ['server', 'src', 'public', 'drizzle', 'package.json', 'package-lock.json',
    'tsconfig.json', 'vite.config.ts', 'vite-env.d.ts', 'drizzle.config.ts', 'index.html',
    '.env.example', 'docker-compose.yml', 'Dockerfile', 'Caddyfile', '.dockerignore']) {
    const src = join(PKG_ROOT, item)
    if (existsSync(src)) cpSync(src, join(dest, item), { recursive: true })
  }

  // Configure .env
  const envPath = join(dest, '.env')
  let env = readFileSync(join(dest, '.env.example'), 'utf8')

  // Auto-detect gateway token
  let token = ''
  try { token = execFileSync('openclaw', ['config', 'get', 'gateway.auth.token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch {}
  if (token) {
    env = env.replace(/GATEWAY_AUTH_TOKEN=.*/, `GATEWAY_AUTH_TOKEN=${token}`)
    console.log(`${G}✓ Gateway token auto-detected${N}`)
  } else {
    console.log(`${Y}⚠ Set GATEWAY_AUTH_TOKEN in .env manually${N}`)
  }

  env = env.replace(/SESSION_SECRET=.*/, `SESSION_SECRET=${randomBytes(32).toString('hex')}`)
  writeFileSync(envPath, env)

  // Install + start
  console.log(`\n${C}Installing dependencies...${N}`)
  run('npm install --silent', { cwd: dest })

  console.log(`${C}Starting PostgreSQL...${N}`)
  run('docker compose up -d db', { cwd: dest })
  await new Promise(r => setTimeout(r, 3000))

  console.log(`${C}Running migrations...${N}`)
  run('npx drizzle-kit migrate', { cwd: dest })

  console.log(`\n${G}╔═══════════════════════════════════════════════╗${N}`)
  console.log(`${G}║   OpenClaw Studio is ready!                   ║${N}`)
  console.log(`${G}╠═══════════════════════════════════════════════╣${N}`)
  console.log(`${G}║                                               ║${N}`)
  console.log(`${G}║   ${C}cd openclaw-studio && npm run dev${G}            ║${N}`)
  console.log(`${G}║                                               ║${N}`)
  console.log(`${G}║   Then open ${C}http://localhost:5173${G}              ║${N}`)
  console.log(`${G}╚═══════════════════════════════════════════════╝${N}`)
  console.log(`\n  Production:  cd openclaw-studio && docker compose up -d --build`)
  console.log(`  Then open:   http://localhost:5181\n`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
