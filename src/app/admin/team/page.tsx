import { cookies } from 'next/headers'
import { TeamView } from '@/components/admin/team-view'
import { getTeamConfig } from '@/data/docs'
import { siteConfig } from '@/data/site'
import { resolveAdminSession } from '@/lib/auth/rbac'
import { SESSION_COOKIE } from '@/lib/auth/session'

export default async function AdminTeamPage() {
  const cookieStore = await cookies()
  const oidc = await resolveAdminSession(cookieStore.get(SESSION_COOKIE)?.value)
  // Past the middleware gate without an OIDC session → break-glass password → Owner.
  const viewerRole = oidc?.role ?? 'owner'
  const viewerEmail = oidc?.email ?? 'break-glass (password)'
  const team = getTeamConfig()

  return (
    <TeamView
      members={team.members}
      domains={team.domains}
      viewerRole={viewerRole}
      viewerEmail={viewerEmail}
      repoUrl={siteConfig.repoUrl ?? ''}
    />
  )
}
