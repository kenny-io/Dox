import { AdminShell } from '@/components/admin/admin-shell'
import { siteConfig } from '@/data/site'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell siteName={siteConfig.name}>{children}</AdminShell>
}
