'use client'

import '@/styles/design-system.css'

import { useState, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  ExternalLink,
  Gauge,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Settings,
  X,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: Array<NavItem>
}

const NAV: Array<NavGroup> = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin', label: 'Home', icon: Home },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/agent-readiness', label: 'Agent Readiness', icon: Gauge },
    ],
  },
  {
    label: 'Admin',
    items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }],
  },
]

const TITLES: Record<string, string> = {
  '/admin': 'Home',
  '/admin/analytics': 'Analytics',
  '/admin/agent-readiness': 'Agent Readiness',
  '/admin/settings': 'Settings',
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ siteName, children }: { siteName: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // The login screen renders bare — no shell chrome.
  if (pathname === '/admin/login') {
    return <div className="dox-dashboard">{children}</div>
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  const title = TITLES[pathname] ?? 'Admin'

  return (
    <div className="dox-dashboard ds-shell">
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside className="ds-rail" data-collapsed={collapsed} data-open={mobileOpen}>
        <div className="ds-rail-card">
          <div className="ds-rail-brand">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ background: 'var(--ds-accent)', color: 'var(--ds-accent-fg)', fontWeight: 'var(--ds-fw-extrabold)' }}
            >
              {siteName.charAt(0).toUpperCase()}
            </span>
            <span
              className="ds-rail-label min-w-0 truncate"
              style={{ fontFamily: 'var(--ds-font-heading)', fontWeight: 'var(--ds-fw-bold)', letterSpacing: 'var(--ds-tracking-tight)' }}
            >
              {siteName}
            </span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="ds-focusable ml-auto rounded p-1 md:hidden"
              style={{ color: 'var(--ds-text-muted)' }}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {NAV.map((group) => (
              <div key={group.label}>
                <div className="ds-rail-group">{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(pathname, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className="ds-nav-item ds-focusable"
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      <span className="ds-rail-label truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="mt-2 space-y-1 border-t pt-3" style={{ borderColor: 'var(--ds-border-subtle)' }}>
            <a href="/" target="_blank" rel="noreferrer" className="ds-nav-item ds-focusable" title={collapsed ? 'View site' : undefined}>
              <ExternalLink className="h-[18px] w-[18px]" />
              <span className="ds-rail-label truncate">View site</span>
            </a>
            <button type="button" onClick={() => void handleLogout()} className="ds-nav-item ds-focusable w-full" title={collapsed ? 'Sign out' : undefined}>
              <LogOut className="h-[18px] w-[18px]" />
              <span className="ds-rail-label truncate">Sign out</span>
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="ds-nav-item ds-focusable hidden w-full md:flex"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
              <span className="ds-rail-label truncate">Collapse</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="ds-content">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-6 py-4"
          style={{
            background: 'color-mix(in oklch, var(--ds-surface-page) 82%, transparent)',
            backdropFilter: 'var(--ds-backdrop-glass)',
            borderBottom: '1px solid var(--ds-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="ds-focusable rounded p-1 md:hidden"
            style={{ color: 'var(--ds-text-secondary)' }}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <div className="ds-eyebrow" style={{ marginBottom: '2px' }}>
              {siteName} Admin
            </div>
            <h1
              style={{
                fontFamily: 'var(--ds-font-heading)',
                fontSize: 'var(--ds-text-h4)',
                fontWeight: 'var(--ds-fw-bold)',
                letterSpacing: 'var(--ds-tracking-tight)',
              }}
            >
              {title}
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
