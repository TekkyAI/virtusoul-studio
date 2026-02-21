import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface DeviceIdentity {
  id: string
  publicKeyRaw: string // base64url
  privateKeyPem: string
  publicKeyPem: string
}

const STORE_DIR = path.join(os.homedir(), '.virtusoul-studio')
const STORE_FILE = path.join(STORE_DIR, 'device.json')

function bufToBase64Url(buf: Buffer): string {
  return buf.toString('base64url')
}

export function getOrCreateDeviceIdentity(): DeviceIdentity {
  // Try loading existing
  try {
    const stored = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'))
    if (stored.id && stored.privateKeyPem && stored.publicKeyPem && stored.publicKeyRaw) {
      return stored
    }
  } catch {}

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string

  // Extract raw 32-byte public key from SPKI (12-byte prefix + 32 bytes)
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' })
  const rawKey = spkiDer.subarray(12)
  const publicKeyRaw = bufToBase64Url(rawKey)

  // Device ID = SHA-256 hex of raw public key
  const id = crypto.createHash('sha256').update(rawKey).digest('hex')

  const identity: DeviceIdentity = { id, publicKeyRaw, privateKeyPem, publicKeyPem }

  fs.mkdirSync(STORE_DIR, { recursive: true })
  fs.writeFileSync(STORE_FILE, JSON.stringify(identity, null, 2), { mode: 0o600 })
  console.log(`[device] Created device identity: ${id.slice(0, 16)}...`)

  return identity
}

export function buildDeviceAuthPayload(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce?: string | null
}): string {
  const version = params.nonce ? 'v2' : 'v1'
  const base = [
    version,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
  ]
  if (version === 'v2') base.push(params.nonce ?? '')
  return base.join('|')
}

export function signPayload(privateKeyPem: string, payload: string): string {
  const sig = crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey(privateKeyPem))
  return bufToBase64Url(sig)
}
