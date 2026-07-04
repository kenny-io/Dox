import { NextResponse, type NextRequest } from 'next/server'
import { getAdminSettings, updateAdminSettings, type AdminSettings } from '@/lib/admin/settings'
import { requireCapabilityFromRequest } from '@/lib/auth/rbac'
import { hashPassword } from '@/lib/admin/secrets'
import type { Role } from '@/lib/auth/types'

export const runtime = 'nodejs'

const ROLES: Array<Role> = ['owner', 'editor', 'viewer']

/** Body may carry write-only secrets in plaintext (never read back). */
type SettingsBody = Partial<AdminSettings> & { docsPassword?: string | null; chatKey?: string | null }

/** Public shape — secrets are surfaced as booleans only, never the hash or key. */
function sanitize(s: AdminSettings) {
  return {
    chatEnabled: s.chatEnabled,
    analyticsEnabled: s.analyticsEnabled,
    allowedDomains: s.allowedDomains,
    hasDocsPassword: Boolean(s.docsPasswordHash),
    hasChatKey: Boolean(s.chatKeyEnc),
  }
}

export async function GET(request: NextRequest) {
  const session = await requireCapabilityFromRequest(request, 'view_analytics')
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(sanitize(await getAdminSettings()))
}

export async function PUT(request: NextRequest) {
  // Settings include access control (allowed domains) → Owner only.
  const session = await requireCapabilityFromRequest(request, 'manage_team')
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: SettingsBody
  try {
    body = (await request.json()) as SettingsBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const patch: Partial<AdminSettings> = {}
  if (typeof body.chatEnabled === 'boolean' || body.chatEnabled === null) {
    patch.chatEnabled = body.chatEnabled
  }
  if (typeof body.analyticsEnabled === 'boolean' || body.analyticsEnabled === null) {
    patch.analyticsEnabled = body.analyticsEnabled
  }
  if (Array.isArray(body.allowedDomains)) {
    patch.allowedDomains = body.allowedDomains
      .filter((d) => d && typeof d.domain === 'string' && d.domain.trim() && ROLES.includes(d.role))
      .map((d) => ({ domain: d.domain.trim().toLowerCase().replace(/^@/, ''), role: d.role }))
  }
  // Docs-access password: hash + store on set; clear on empty/null. Write-only.
  if (typeof body.docsPassword === 'string' && body.docsPassword.trim()) {
    patch.docsPasswordHash = hashPassword(body.docsPassword)
  } else if (body.docsPassword === '' || body.docsPassword === null) {
    patch.docsPasswordHash = null
  }

  return NextResponse.json(sanitize(await updateAdminSettings(patch)))
}
