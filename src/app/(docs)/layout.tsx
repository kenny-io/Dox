import { SiteShell } from '@/components/layout/site-shell'
import { SidebarCollectionsHydrator } from '@/components/layout/sidebar-hydrator'
import { getSearchableDocs, getSidebarCollections } from '@/data/docs'
import type { NavigationSection } from '@/data/docs'
import { buildApiNavigation } from '@/data/api-reference'

interface DocsLayoutProps {
  children: React.ReactNode
}

export default async function DocsLayout({ children }: DocsLayoutProps) {
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

  const sidebarCollections = getSidebarCollections()
  const collections = sidebarCollections.map((collection) => {
    if (collection.api) {
      return { ...collection, sections: apiSections }
    }
    if (!collection.href && collection.id === 'overview') {
      return { ...collection, href: '/' }
    }
    return collection
  })
  const searchIndex = getSearchableDocs()

  return (
    <>
      <SidebarCollectionsHydrator collections={collections} />
      <SiteShell searchIndex={searchIndex}>
        {children}
      </SiteShell>
    </>
  )
}

