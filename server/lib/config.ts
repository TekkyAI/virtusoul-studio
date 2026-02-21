import { readFile, writeFile, rename, copyFile, mkdir, readdir, stat } from 'fs/promises'
import { homedir } from 'os'
import { join, dirname } from 'path'

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')
const BACKUP_DIR = join(homedir(), '.openclaw', 'backups')

export async function readConfig(): Promise<any> {
  const raw = await readFile(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw)
}

export async function writeConfig(config: any): Promise<void> {
  const json = JSON.stringify(config, null, 2) + '\n'
  JSON.parse(json) // validate

  const tmpPath = CONFIG_PATH + '.tmp'
  await writeFile(tmpPath, json, 'utf-8')

  try {
    await mkdir(BACKUP_DIR, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    await copyFile(CONFIG_PATH, join(BACKUP_DIR, `openclaw-${ts}.json`))
  } catch {}

  await rename(tmpPath, CONFIG_PATH)
}

export async function listBackups(): Promise<{ name: string; date: string; size: number }[]> {
  await mkdir(BACKUP_DIR, { recursive: true })
  const files = await readdir(BACKUP_DIR)
  const backups = await Promise.all(
    files.filter(f => f.endsWith('.json')).map(async f => {
      const s = await stat(join(BACKUP_DIR, f))
      return { name: f, date: s.mtime.toISOString(), size: s.size }
    })
  )
  return backups.sort((a, b) => b.date.localeCompare(a.date))
}

export async function createBackup(): Promise<void> {
  await mkdir(BACKUP_DIR, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  await copyFile(CONFIG_PATH, join(BACKUP_DIR, `openclaw-${ts}.json`))
}

export async function restoreBackup(name: string): Promise<void> {
  if (name.includes('..') || name.includes('/')) throw new Error('Invalid backup name')
  const backupPath = join(BACKUP_DIR, name)
  const raw = await readFile(backupPath, 'utf-8')
  JSON.parse(raw) // validate it's valid JSON
  // Backup current before restoring
  await createBackup()
  await copyFile(backupPath, CONFIG_PATH)
}

const SENSITIVE_KEYS = ['token', 'apiKey', 'botToken', 'password', 'secret']

export function maskSensitive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(maskSensitive)
  const result: any = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s.toLowerCase())) && typeof v === 'string' && v.length > 0) {
      result[k] = '••••••'
    } else {
      result[k] = maskSensitive(v)
    }
  }
  return result
}
