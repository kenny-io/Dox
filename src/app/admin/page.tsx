import { HomeView } from '@/components/admin/home-view'
import { siteConfig } from '@/data/site'

export default function AdminPage() {
  return <HomeView siteName={siteConfig.name} />
}
