import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/app/providers'
import { siteConfig } from '@/data/site'
import { cn } from '@/lib/utils'
import { hexToHslString } from '@/lib/colors'

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
  metadataBase: new URL('https://dox-template.local'),
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
  openGraph: {
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
    url: 'https://dox-template.local',
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
  },
}

const brandStyle: CSSProperties = {
  '--brand-light-background': hexToHslString(siteConfig.brand.light.background),
  '--brand-light-foreground': hexToHslString(siteConfig.brand.light.foreground),
  '--brand-light-accent': hexToHslString(siteConfig.brand.light.accent),
  '--brand-light-accent-foreground': hexToHslString(siteConfig.brand.light.accentForeground),
  '--brand-dark-background': hexToHslString(siteConfig.brand.dark.background),
  '--brand-dark-foreground': hexToHslString(siteConfig.brand.dark.foreground),
  '--brand-dark-accent': hexToHslString(siteConfig.brand.dark.accent),
  '--brand-dark-accent-foreground': hexToHslString(siteConfig.brand.dark.accentForeground),
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
