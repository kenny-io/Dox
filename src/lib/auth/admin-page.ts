import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveAdminSession, type AdminSession } from '@/lib/auth/rbac'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken, isAdminEnabled } from '@/lib/admin/auth'
import { getOidcConfig } from '@/lib/auth/oidc'

function isAdminAuthConfigured(): boolean {
  return isAdminEnabled() || Boolean(getOidcConfig())
}

/** Resolve the current admin from request cookies (server components / pages). */
export async function resolveAdminFromCookies(): Promise<AdminSession | null> {
  const store = await cookies()
  const oidc = await resolveAdminSession(store.get(SESSION_COOKIE)?.value)
  if (oidc) return oidc
  const password = store.get(ADMIN_SESSION_COOKIE)?.value
  if (password && verifyAdminSessionToken(password)) return { email: 'break-glass', role: 'owner' }
  return null
}

/**
 * Node-side roster enforcement for admin PAGES. The edge middleware admits any
 * signature-valid session (coarse); this is the live-role check it defers to
 * node — a member removed/downgraded in docs.json is redirected to login on
 * their next page load, instead of lingering for the cookie's 8h TTL.
 *
 * Call this at the top of each admin page (not the layout — that also wraps
 * /admin/login and would loop). Returns null only for an unconfigured (open-dev)
 * admin, where callers may assume Owner.
 */
export async function requireAdminPageSession(): Promise<AdminSession | null> {
  if (!isAdminAuthConfigured()) return null
  const session = await resolveAdminFromCookies()
  if (!session) redirect('/admin/login')
  return session
}
