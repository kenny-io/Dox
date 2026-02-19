'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { SidebarCollection, SearchableDoc } from '@/data/docs'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { CommandSearch } from '@/components/search/command-search'
import { ThemeSwitch } from '@/components/theme/theme-switch'
import { VersionSwitcher } from '@/components/docs/version-switcher'
import { shell } from '@/config/layout'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/data/site'

function matchesPath(targetHref: string, pathname: string) {
  if (!targetHref || /^https?:\/\//i.test(targetHref)) {
    return false
  }
  const normalize = (value: string) => {
    if (!value) return '/'
    if (value === '/') return '/'
    return value.endsWith('/') ? value.slice(0, -1) : value
  }
  const normalizedTarget = normalize(targetHref)
  const normalizedPath = normalize(pathname)
  if (normalizedTarget === '/') {
    return normalizedPath === '/'
  }
  return normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)
}

interface TopBarProps {
  collections: Array<SidebarCollection>
  activeCollectionId: SidebarCollection['id']
  onCollectionChange: (id: SidebarCollection['id']) => void
  activeSections: SidebarCollection['sections']
  searchIndex: Array<SearchableDoc>
}

export function TopBar({
  collections,
  activeCollectionId,
  onCollectionChange,
  activeSections,
  searchIndex,
}: TopBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supportLink =
    siteConfig.links.find((link) => {
      const label = link.label.toLowerCase()
      return label.includes('support') || label.includes('contact')
    })
  const primaryCta =
    siteConfig.links.find((link) => {
      const label = link.label.toLowerCase()
      return link !== supportLink && (label.includes('get') || label.includes('start') || label.includes('demo'))
    })

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className={cn('flex flex-col gap-3 py-3 sm:gap-4 sm:py-4', shell.topbar)}>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <MobileNav sections={activeSections} />
          <div className="ml-auto flex w-full flex-1 flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <Suspense
              fallback={
                <div className="hidden h-9 flex-1 items-center rounded-full border border-border/40 px-4 sm:h-10 lg:flex" />
              }
            >
              <CommandSearch searchIndex={searchIndex} />
            </Suspense>
            {supportLink ? (
              <Link
                href={supportLink.href}
                className="hidden items-center rounded-full border border-border/50 px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:text-foreground sm:inline-flex sm:px-4 sm:py-2 sm:text-sm"
              >
                <span className="hidden sm:inline">{supportLink.label}</span>
                <span className="inline sm:hidden">{supportLink.label.split(' ')[0]}</span>
              </Link>
            ) : null}
            {primaryCta ? (
              <Link
                href={primaryCta.href}
                className="inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow hover:bg-accent/90 sm:px-4 sm:py-2 sm:text-sm"
              >
                <span className="hidden sm:inline">{primaryCta.label}</span>
                <span className="inline sm:hidden">{primaryCta.label.replace('Get ', '')}</span>
              </Link>
            ) : null}
            <VersionSwitcher />
            <ThemeSwitch />
          </div>
        </div>
        <div className="scrollbar-hide -mx-2 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/50 bg-muted/20 px-2 py-1 text-xs font-semibold sm:mx-0 sm:gap-2 sm:text-sm">
          {collections.map((collection) => {
            const isActive = !collection.href && collection.id === activeCollectionId
            const baseClasses = cn(
              'group relative shrink-0 rounded-2xl px-3 py-1.5 text-left transition whitespace-nowrap sm:px-4 sm:py-2',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-foreground/70 hover:bg-background/70 hover:text-foreground',
            )
            if (collection.href) {
              const isExternal = /^https?:\/\//.test(collection.href)
              return (
                <a
                  key={collection.id}
                  href={collection.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noreferrer' : undefined}
                  className={baseClasses}
                >
                  {collection.label}
                </a>
              )
            }
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => {
                  const targetHref = collection.href
                  const alreadyActive = targetHref ? matchesPath(targetHref, pathname) : false
                  onCollectionChange(collection.id)
                  if (!alreadyActive && targetHref && !matchesPath(targetHref, pathname)) {
                    router.push(targetHref)
                  }
                }}
                className={baseClasses}
              >
                <span
                  className={cn(
                    'pointer-events-none absolute inset-x-2 bottom-0.5 h-0.5 rounded-full transition sm:bottom-1',
                    isActive ? 'bg-accent' : 'bg-transparent group-hover:bg-border/80',
                  )}
                />
                {collection.label}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}

