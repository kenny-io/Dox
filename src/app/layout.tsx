import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/app/providers'
import { siteConfig } from '@/data/site'
import { cn } from '@/lib/utils'
import { toHslValue } from '@/lib/colors'

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: `${siteConfig.name} Documentation`,
    template: `%s • ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'documentation template',
    'next.js',
    'mintlify alternative',
    'tailwind css',
    'radix ui',
  ],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  openGraph: {
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
  },
}

const brandStyle: Record<string, string> = {
  '--brand-light-background': toHslValue(siteConfig.brand.light.background),
  '--brand-light-foreground': toHslValue(siteConfig.brand.light.foreground),
  '--brand-light-muted': toHslValue(siteConfig.brand.light.muted),
  '--brand-light-border': toHslValue(siteConfig.brand.light.border),
  '--brand-light-accent': toHslValue(siteConfig.brand.light.accent),
  '--brand-light-accent-foreground': toHslValue(siteConfig.brand.light.accentForeground),
  '--brand-light-ring': toHslValue(siteConfig.brand.light.ring),
  '--brand-sidebar-active-bg-light': toHslValue(siteConfig.brand.light.sidebarActiveBg),
  '--brand-sidebar-active-text-light': toHslValue(siteConfig.brand.light.sidebarActiveText),
  '--brand-dark-background': toHslValue(siteConfig.brand.dark.background),
  '--brand-dark-foreground': toHslValue(siteConfig.brand.dark.foreground),
  '--brand-dark-muted': toHslValue(siteConfig.brand.dark.muted),
  '--brand-dark-border': toHslValue(siteConfig.brand.dark.border),
  '--brand-dark-accent': toHslValue(siteConfig.brand.dark.accent),
  '--brand-dark-accent-foreground': toHslValue(siteConfig.brand.dark.accentForeground),
  '--brand-dark-ring': toHslValue(siteConfig.brand.dark.ring),
  '--brand-sidebar-active-bg-dark': toHslValue(siteConfig.brand.dark.sidebarActiveBg),
  '--brand-sidebar-active-text-dark': toHslValue(siteConfig.brand.dark.sidebarActiveText),
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning style={brandStyle}>
      <body className={cn('min-h-screen bg-background font-sans text-foreground antialiased', fontSans.variable, fontMono.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
