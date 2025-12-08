'use client'

import { Suspense } from 'react'
import type { SidebarCollection } from '@/data/docs'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { CommandSearch } from '@/components/search/command-search'
import { ThemeSwitch } from '@/components/theme/theme-switch'
import { shell } from '@/config/layout'
import { cn } from '@/lib/utils'

interface TopBarProps {
  collections: Array<SidebarCollection>
  activeCollectionId: SidebarCollection['id']
  onCollectionChange: (id: SidebarCollection['id']) => void
  activeSections: SidebarCollection['sections']
}

export function TopBar({ collections, activeCollectionId, onCollectionChange, activeSections }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className={cn('flex flex-wrap items-center gap-3 py-4', shell.topbar)}>
        <MobileNav sections={activeSections} />
        <div className="order-3 flex w-full items-center gap-2 overflow-x-auto rounded-full bg-muted/30 px-2 py-1 text-sm font-semibold lg:order-none lg:w-auto lg:bg-transparent lg:px-0 lg:py-0">
          {collections.map((collection) => {
          const isActive = !collection.href && collection.id === activeCollectionId
          const baseClasses = cn(
                  'group relative rounded-2xl px-4 py-2 text-left transition whitespace-nowrap',
                  isActive
                    ? 'bg-emerald-500/[0.08] text-foreground shadow-sm'
                    : 'text-foreground/70 hover:bg-muted/40 hover:text-foreground',
          )
          const indicator = (
                <span
                  className={cn(
                    'pointer-events-none absolute -left-4 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition',
                    isActive ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-border/80',
                  )}
                />
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
                {indicator}
                {collection.label}
              </a>
            )
          }
          return (
            <button
              key={collection.id}
              type="button"
              onClick={() => onCollectionChange(collection.id)}
              className={baseClasses}
            >
              {indicator}
              {collection.label}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Suspense
            fallback={
              <div className="hidden h-10 flex-1 items-center rounded-full border border-border/40 px-4 lg:flex" />
            }
          >
            <CommandSearch />
          </Suspense>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  )
}

