import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/app/providers'
import { siteConfig } from '@/data/site'
import { getBannerConfig, getCustomScriptsConfig, getFontsConfig, getI18nConfig, getStructuralTheme } from '@/data/docs'
import { cn } from '@/lib/utils'
import { toHslValue } from '@/lib/colors'
import { buildOgImageUrl } from '@/lib/og'
import { AnalyticsProvider } from '@/components/analytics/analytics-provider'
import { SiteBanner } from '@/components/layout/site-banner'

// Default fonts via next/font (optimal performance — preloaded, no FOUC)
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

// ---------------------------------------------------------------------------
// Custom font injection from docs.json
// ---------------------------------------------------------------------------

function buildGoogleFontsUrl(family: string, weights: string[]): string {
  const familyParam = family.replace(/ /g, '+')
  // Google Fonts v2 format: family=Name:wght@400;600;700
  const weightParam = weights.join(';')
  return `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=swap`
}

const fontsConfig = getFontsConfig()

// Deduplicate Google Font URLs (body and heading might be the same family)
const googleFontUrlSet = new Set<string>()
let bodyFontFamily: string | null = null
let headingFontFamily: string | null = null

if (fontsConfig.body?.family) {
  bodyFontFamily = fontsConfig.body.family
  googleFontUrlSet.add(
    buildGoogleFontsUrl(fontsConfig.body.family, fontsConfig.body.weight ?? ['400', '500', '600', '700']),
  )
}

if (fontsConfig.heading?.family) {
  headingFontFamily = fontsConfig.heading.family
  googleFontUrlSet.add(
    buildGoogleFontsUrl(fontsConfig.heading.family, fontsConfig.heading.weight ?? ['600', '700']),
  )
}

const googleFontUrls = Array.from(googleFontUrlSet)

// CSS variable overrides injected into :root when custom fonts are set
const fontOverrides = [
  bodyFontFamily ? `--font-sans: '${bodyFontFamily}', sans-serif;` : '',
  headingFontFamily ? `--font-heading: '${headingFontFamily}', sans-serif;` : '',
]
  .filter(Boolean)
  .join(' ')

// ---------------------------------------------------------------------------
// Structural theme — read once at module level (same as fonts above)
const structuralTheme = getStructuralTheme()

// Structural theme CSS variable injection
// Injected as a <style> tag (same pattern as fontOverrides) so the overrides
// are SSR'd directly in the HTML. This is more reliable than html[data-theme]
// CSS attribute selectors, which depend on module-level caching behaviour and
// Next.js HMR propagation timing.
// ---------------------------------------------------------------------------
const THEME_VARS: Record<string, string> = {
  default: '',
  maple: [
    '--theme-radius-sm:0.5rem',
    '--theme-radius-md:0.75rem',
    '--theme-radius-lg:1.25rem',
    '--theme-radius-xl:2rem',
    '--theme-sidebar-item-radius:0.625rem',
    '--theme-sidebar-indicator-opacity:0',
    '--theme-nav-bar-radius:1.5rem',
    '--theme-nav-tab-radius:9999px',
    '--theme-nav-tab-indicator-opacity:0',
  ].join(';'),
  sharp: [
    '--theme-radius-sm:0.125rem',
    '--theme-radius-md:0.1875rem',
    '--theme-radius-lg:0.25rem',
    '--theme-radius-xl:0.375rem',
    '--theme-sidebar-item-radius:0.1875rem',
    '--theme-sidebar-indicator-opacity:1',
    '--sidebar-active-bg:0 0% 0% / 0',
    '--theme-nav-bar-bg:transparent',
    '--theme-nav-bar-border-color:transparent',
    '--theme-nav-bar-radius:0.25rem',
    '--theme-nav-tab-radius:0.25rem',
    '--theme-nav-tab-indicator-opacity:1',
  ].join(';'),
  minimal: [
    '--theme-radius-sm:0',
    '--theme-radius-md:0',
    '--theme-radius-lg:0',
    '--theme-radius-xl:0',
    '--theme-sidebar-item-radius:0',
    '--theme-sidebar-indicator-opacity:0',
    '--sidebar-active-bg:0 0% 0% / 0',
    '--theme-nav-bar-bg:transparent',
    '--theme-nav-bar-border-color:transparent',
    '--theme-nav-tab-active-bg:transparent',
    '--theme-nav-tab-active-shadow:none',
    '--theme-nav-bar-radius:0',
    '--theme-nav-tab-radius:0',
    '--theme-nav-tab-indicator-opacity:1',
  ].join(';'),
}
const themeVars = THEME_VARS[structuralTheme] ?? ''

// ---------------------------------------------------------------------------

const defaultOgImage = buildOgImageUrl({})

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
    icon: '/icon',
    shortcut: '/icon',
  },
  openGraph: {
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    siteName: siteConfig.name,
    images: [{ url: defaultOgImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} Documentation`,
    description: siteConfig.description,
    images: [defaultOgImage],
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

const defaultLang = getI18nConfig()?.defaultLocale ?? 'en'
const bannerConfig = getBannerConfig()
const customScripts = getCustomScriptsConfig()

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={defaultLang} suppressHydrationWarning style={brandStyle} data-theme={structuralTheme}>
      <head>
        {/* Google Fonts for custom body/heading fonts set in docs.json */}
        {googleFontUrls.length > 0 && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            {googleFontUrls.map((url) => (
              <link key={url} rel="stylesheet" href={url} />
            ))}
          </>
        )}
        {/* CSS variable overrides for custom fonts */}
        {fontOverrides && <style>{`:root { ${fontOverrides} }`}</style>}
        {/* CSS variable overrides for structural theme (radius, sidebar, nav tabs) */}
        {themeVars && <style>{`:root { ${themeVars} }`}</style>}
      </head>
      <body className={cn('min-h-screen bg-background font-sans text-foreground antialiased', fontSans.variable, fontMono.variable)}>
        {bannerConfig && <SiteBanner banner={bannerConfig} />}
        <Providers>{children}</Providers>
        <AnalyticsProvider />
        {customScripts.map((script) => (
          <Script
            key={script.src}
            src={script.src}
            strategy={script.strategy ?? 'afterInteractive'}
          />
        ))}
      </body>
    </html>
  )
}
