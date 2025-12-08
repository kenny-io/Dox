'use client'

import * as ScrollArea from '@radix-ui/react-scroll-area'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavigationSection } from '@/data/docs'
import { Badge } from '@/components/ui/badge'
import { layout, typography } from '@/config/layout'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/layout/logo'
import { siteConfig } from '@/data/site'

interface SidebarProps {
  sections: Array<NavigationSection>
  title: string
  className?: string
}

export function Sidebar({ sections, title, className }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className={cn('hidden shrink-0 border-r border-border/80 bg-background lg:block', layout.sidebarWidth, className)}>
      <ScrollArea.Root className="h-screen w-full">
        <ScrollArea.Viewport className="h-full w-full">
          <div className={cn('flex flex-col gap-8', layout.sidebarPadding)}>
            <div className="flex items-center gap-3 px-1">
              <Logo />
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  {siteConfig.name}
                </p>
              </div>
            </div>
            <div className="px-1">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-foreground/40">
                {title}
              </p>
            </div>
            <nav className="flex flex-col gap-8">
              {sections.map((section) => {
              return (
                <div key={section.title} className="space-y-4">
                  <p className={cn(typography.meta, 'px-1 uppercase tracking-wide text-foreground/70')}>
                    {section.title}
                  </p>
                  <div className="relative pl-4">
                    <span className="absolute inset-y-0 left-1 w-px rounded-full bg-border/70" />
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const active = isActive(item.href)
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'group relative block rounded-2xl px-4 py-2 text-left transition',
                              active
                                ? 'bg-emerald-500/[0.08] text-foreground shadow-sm'
                                : 'text-foreground/70 hover:bg-muted/40 hover:text-foreground',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute -left-4 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition',
                                active ? 'bg-emerald-500' : 'bg-transparent group-hover:bg-border/80',
                              )}
                            />
                            <span
                              className={cn(
                                'flex items-center gap-2 text-sm leading-tight',
                                active ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {item.title}
                              {item.badge ? <Badge className="text-[10px] uppercase">{item.badge}</Badge> : null}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
              })}
            </nav>
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-2 bg-transparent">
          <ScrollArea.Thumb className="rounded-full bg-foreground/20" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </aside>
  )
}

