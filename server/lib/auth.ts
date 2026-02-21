import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Simple HMAC-signed session token: userId.timestamp.signature
const secret = () => process.env.SESSION_SECRET || 'dev-secret-change-me'

export function createSessionToken(userId: string): string {
  const payload = `${userId}.${Date.now()}`
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, ts, sig] = parts
  const expected = crypto.createHmac('sha256', secret()).update(`${userId}.${ts}`).digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  return userId
}

export const SESSION_COOKIE = 'vs_session'
