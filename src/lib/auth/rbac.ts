import { verifySession } from '@/lib/auth/session'
import { resolveRoleFromRoster } from '@/lib/auth/roster'
import { roleAllows, type Capability, type Role } from '@/lib/auth/types'

export interface AdminSession {
  email: string
  role: Role
}

/**
 * A member's current role — resolved LIVE from the git-committed roster on every
 * request, never trusted from the cookie. Remove or downgrade someone in
 * `docs.json` and their next request reflects it immediately.
 */
export function resolveRole(email: string): Role | null {
  return resolveRoleFromRoster(email)
}

/**
 * Turn a session cookie into an authorized admin: verify the signature
 * (identity), then resolve the role live from the roster. Null when the cookie
 * is invalid or the identity is no longer in the roster. Server-side only.
 */
export async function resolveAdminSession(token: string | undefined): Promise<AdminSession | null> {
  const session = await verifySession(token)
  if (!session) return null
  const role = resolveRole(session.email)
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
