import { SidebarCollectionsHydrator } from '@/components/layout/sidebar-hydrator'
import { sidebarCollections } from '@/data/docs'
import type { NavigationSection } from '@/data/docs'
import { buildApiNavigation } from '@/data/api-reference'

interface ApiLayoutProviderProps {
  children: React.ReactNode
  params: { slug?: Array<string> }
}

export default async function ApiLayoutProvider({ children, params }: ApiLayoutProviderProps) {
  const specId = params.slug?.[0]
  const navigation = await buildApiNavigation(specId)
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

  const collections = sidebarCollections.map((collection) =>
    collection.id === 'api' ? { ...collection, sections: apiSections } : collection,
  )

  return (
    <>
      <SidebarCollectionsHydrator collections={collections} />
      {children}
    </>
  )
}

