'use client'

import { Footer } from '@/components/layout/footer'
import { TopBar } from '@/components/layout/top-bar'
import { Sidebar } from '@/components/navigation/sidebar'
import { PageContainer } from '@/components/layout/sections'
import { layout, shell } from '@/config/layout'
import type { SidebarCollection, SearchableDoc } from '@/data/docs'
import { useSidebarCollectionsStore } from './sidebar-store'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

function collectionContainsPath(collection: SidebarCollection, pathname: string) {
  if (collection.href && matchesPath(collection.href, pathname)) {
    return true
  }
  return collection.sections.some((section) =>
    section.items.some((item) => matchesPath(item.href, pathname)),
  )
}

function matchesPath(targetHref: string, pathname: string) {
  if (!targetHref || /^https?:\/\//i.test(targetHref)) {
    return false
  }
  const normalizedTarget = normalizePath(targetHref)
  const normalizedPath = normalizePath(pathname)
  if (normalizedTarget === '/') {
    return normalizedPath === '/'
  }
  return normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)
}

function normalizePath(value: string) {
  if (!value) {
    return '/'
  }
  if (value === '/') {
    return '/'
  }
  return value.endsWith('/') ? value.slice(0, -1) : value
}

interface SiteShellProps {
  children: React.ReactNode
  searchIndex: Array<SearchableDoc>
}

export function SiteShell({ children, searchIndex }: SiteShellProps) {
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
  const activeCollection = (() => {
    if (selectedCollection) {
      if (collectionContainsPath(selectedCollection, pathname)) {
        return selectedCollection
      }
      if (selectedCollection.href && matchesPath(selectedCollection.href, pathname)) {
        return selectedCollection
      }
    }
    return matchedCollection
  })()

  if (!activeCollection) {
    return null
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <div className={`flex min-h-screen w-full ${shell.wrapper}`}>
        <Sidebar
          sections={activeCollection.sections}
          title={activeCollection.label}
        />
        <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
          <TopBar
            collections={collections}
            activeCollectionId={activeCollection.id}
            onCollectionChange={(id) => {
              const target = collections.find((collection) => collection.id === id)
              if (!target) {
                return
              }
              setSelectedCollectionId(target.id)
              const targetHref = target.href
              const firstHref = target.sections[0]?.items[0]?.href
              if (targetHref && !matchesPath(targetHref, pathname)) {
                router.push(targetHref)
                return
              }
              if (firstHref && !collectionContainsPath(target, pathname)) {
                router.push(firstHref)
              }
            }}
            activeSections={activeCollection.sections}
            searchIndex={searchIndex}
          />
          <main className="flex-1 py-6 sm:py-8 lg:py-10">
            <PageContainer className={layout.pageGap}>{children}</PageContainer>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}

