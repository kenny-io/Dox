import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Salted scrypt hash for the docs-access password. Format: `salt:hash` (hex).
 * We store the hash, never the plaintext — a GET of settings must never return it.
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPasswordHash(plain: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  try {
    const hash = scryptSync(plain, Buffer.from(saltHex, 'hex'), 32)
    const expected = Buffer.from(hashHex, 'hex')
    return hash.length === expected.length && timingSafeEqual(hash, expected)
  } catch {
    return false
  }
}
