export interface SiteLink {
  label: string
  href: string
}

export interface BrandConfig {
  light: {
    accent: string
    accentForeground: string
    background: string
    foreground: string
  }
  dark: {
    accent: string
    accentForeground: string
    background: string
    foreground: string
  }
}

export interface SiteConfig {
  name: string
  description: string
  repoUrl: string
  links: Array<SiteLink>
  brand: BrandConfig
}

export const siteConfig: SiteConfig = {
  name: 'Dox',
  description:
    'Dox is a Mintlify-style documentation template built on Next.js, Tailwind, Radix, and shadcn UI without inherited licensing constraints.',
  repoUrl: 'https://github.com/ekene/dox',
  links: [
    { label: 'Docs', href: '/' },
    { label: 'GitHub', href: 'https://github.com/ekene' },
    { label: 'Changelog', href: '/changelog' },
  ],
  brand: {
    light: {
      accent: '#0F172A',
      accentForeground: '#F8FAFC',
      background: '#FFFFFF',
      foreground: '#0F172A',
    },
    dark: {
      accent: '#F8FAFC',
      accentForeground: '#020617',
      background: '#020617',
      foreground: '#F8FAFC',
    },
  },
}

