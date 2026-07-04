import { NextResponse, type NextRequest } from 'next/server'
import { getAdminSettings, updateAdminSettings, type AdminSettings } from '@/lib/admin/settings'
import { requireCapabilityFromRequest } from '@/lib/auth/rbac'
import type { Role } from '@/lib/auth/types'

export const runtime = 'nodejs'

const ROLES: Array<Role> = ['owner', 'editor', 'viewer']

export async function GET(request: NextRequest) {
  const session = await requireCapabilityFromRequest(request, 'view_analytics')
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getAdminSettings())
}

export async function PUT(request: NextRequest) {
  // Settings include access control (allowed domains) → Owner only.
  const session = await requireCapabilityFromRequest(request, 'manage_team')
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Partial<AdminSettings>
  try {
    body = (await request.json()) as Partial<AdminSettings>
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

  return NextResponse.json(await updateAdminSettings(patch))
}
