'use client'

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
    if (!href || /^https?:\/\//i.test(href)) {
      return false
    }
    const normalizedHref = normalizePath(href)
    const normalizedPath = normalizePath(pathname)
    if (normalizedHref === '/') {
      return normalizedPath === '/'
    }
    const segments = normalizedHref.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return normalizedPath === normalizedHref
    }
    return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`)
  }

  return (
    <aside
      className={cn('hidden shrink-0 border-r border-border/80 bg-background lg:block', layout.sidebarWidth, className)}
    >
      <div className="sticky top-0 flex max-h-screen flex-col overflow-hidden">
        <div className={cn('flex flex-1 flex-col gap-6 overflow-hidden', layout.sidebarPadding)}>
          <div className="flex flex-col gap-3 px-1 pt-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo showText={false} className="shrink-0" />
              <span className="text-sm font-semibold text-foreground">{siteConfig.name} Docs</span>
            </Link>
          </div>
          <div className="px-1">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-foreground/40 line-clamp-1">{title}</p>
          </div>
          <nav className="flex-1 space-y-6 overflow-y-auto overscroll-y-contain pr-1 pb-4">
            {sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <p className={cn(typography.meta, 'px-1 uppercase tracking-wide text-foreground/70 line-clamp-2')}>{section.title}</p>
                <div className="relative pl-4">
                  <span className="absolute inset-y-0 left-1 w-px rounded-full bg-border/70" />
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href)
                      const activeStyles = active
                        ? {
                            backgroundColor: `hsl(var(--sidebar-active-bg))`,
                            color: `hsl(var(--sidebar-active-text))`,
                          }
                        : undefined
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative block rounded-2xl px-3 py-2 text-left transition',
                            active
                              ? 'rounded-lg text-foreground shadow-none'
                              : 'text-foreground/70 hover:bg-muted/40 hover:text-foreground',
                          )}
                          style={activeStyles}
                        >
                          <span
                            className={cn(
                              'absolute -left-4 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition',
                              active ? 'bg-accent' : 'bg-transparent group-hover:bg-border/80',
                            )}
                          />
                          <span
                            className={cn(
                              'flex items-center gap-2 text-sm leading-tight',
                              active ? 'font-semibold' : 'font-medium',
                            )}
                          >
                            <span className="line-clamp-2 break-words">{item.title}</span>
                            {item.badge ? <Badge className="shrink-0 text-[10px] uppercase">{item.badge}</Badge> : null}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  )
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

