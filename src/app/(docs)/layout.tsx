import { SiteShell } from '@/components/layout/site-shell'
import { SidebarCollectionsHydrator } from '@/components/layout/sidebar-hydrator'
import { sidebarCollections } from '@/data/docs'
import type { NavigationSection, SidebarCollection } from '@/data/docs'
import { buildApiNavigation } from '@/data/api-reference'

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const navigation = await buildApiNavigation()
  const apiSections: Array<NavigationSection> = navigation.map((group) => ({
    title: group.title,
    items: group.items.map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      badge: item.badge,
      description: `${item.method} ${item.path}`,
    })),
  }))

  const isApiCollection = (collection: SidebarCollection) => {
    const normalizedId = collection.id.toLowerCase()
    const normalizedLabel = collection.label.toLowerCase()
    if (collection.href) {
      return false
    }
    if (normalizedId === 'api') {
      return true
    }
    if (normalizedId.includes('api') && normalizedId.includes('reference')) {
      return true
    }
    return normalizedLabel.includes('api reference')
  }

  const collections = sidebarCollections.map((collection) =>
    isApiCollection(collection) ? { ...collection, sections: apiSections } : collection,
  )

  return (
    <>
      <SidebarCollectionsHydrator collections={collections} />
      <SiteShell>{children}</SiteShell>
    </>
  )
}

