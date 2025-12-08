'use client'

import { Footer } from '@/components/layout/footer'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageContainer } from '@/components/layout/sections'
import { layout, shell } from '@/config/layout'
import type { SidebarCollection } from '@/data/docs'
import { useSidebarCollectionsStore } from './sidebar-store'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

function collectionContainsPath(collection: SidebarCollection, pathname: string) {
  return collection.sections.some((section) =>
    section.items.some((item) => (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))),
  )
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const collections = useSidebarCollectionsStore((state) => state.collections)
  const pathname = usePathname()
  const router = useRouter()
  const navigableCollections = collections.filter((collection) => collection.sections.length > 0)
  const matchedCollection =
    navigableCollections.find((collection) => collectionContainsPath(collection, pathname)) ??
    navigableCollections[0] ??
    collections[0]
  const [selectedCollectionId, setSelectedCollectionId] = useState<SidebarCollection['id'] | null>(null)
  const selectedCollection =
    selectedCollectionId && navigableCollections.find((collection) => collection.id === selectedCollectionId)
  const activeCollection =
    selectedCollection && collectionContainsPath(selectedCollection, pathname)
      ? selectedCollection
      : matchedCollection

  if (!activeCollection) {
    return null
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <div className={`flex min-h-screen w-full ${shell.wrapper}`}>
        <Sidebar sections={activeCollection.sections} title={activeCollection.label} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar
            collections={collections}
            activeCollectionId={activeCollection.id}
            onCollectionChange={(id) => {
              const target = collections.find((collection) => collection.id === id)
              if (!target) {
                return
              }
              setSelectedCollectionId(target.id)
              const firstHref = target.sections[0]?.items[0]?.href
              if (firstHref && !collectionContainsPath(target, pathname)) {
                router.push(firstHref)
              }
            }}
            activeSections={activeCollection.sections}
          />
          <main className="flex-1 py-10">
            <PageContainer className={layout.pageGap}>{children}</PageContainer>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

