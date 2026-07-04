import { getMember } from '@/lib/auth/team'
import { verifySession } from '@/lib/auth/session'
import { roleAllows, type Capability, type Role } from '@/lib/auth/types'

export interface AdminSession {
  email: string
  role: Role
}

/**
 * Resolve a member's current role — a LIVE read from F1, never from the cookie.
 * That's what makes revocation/downgrade instant: remove or change the member
 * and their next request reflects it, without waiting for the cookie to expire.
 */
export async function resolveRole(email: string): Promise<Role | null> {
  const member = await getMember(email)
  if (!member || member.status !== 'active') return null
  return member.role
}

/**
 * Turn a session cookie into an authorized admin: verify the signature (identity),
 * then resolve the role live. Returns null if the cookie is invalid or the member
 * is no longer active. Server-side only (reaches F1) — not for edge middleware.
 */
export async function resolveAdminSession(token: string | undefined): Promise<AdminSession | null> {
  const session = await verifySession(token)
  if (!session) return null
  const role = await resolveRole(session.email)
  return role ? { email: session.email, role } : null
}

/** Resolve the session and require a capability; null if unauthenticated or unauthorized. */
export async function requireCapability(
  token: string | undefined,
  capability: Capability,
): Promise<AdminSession | null> {
  const session = await resolveAdminSession(token)
  if (!session) return null
  return roleAllows(session.role, capability) ? session : null
}
