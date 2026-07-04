import { SettingsView } from '@/components/admin/settings-view'
import { requireAdminPageSession } from '@/lib/auth/admin-page'

export default async function AdminSettingsPage() {
  await requireAdminPageSession()
  return <SettingsView />
}
