export interface SiteLink {
  label: string
  href: string
}

export type BrandPresetKey = 'primary' | 'secondary'

export interface BrandPalette {
  background: string
  foreground: string
  muted: string
  border: string
  accent: string
  accentForeground: string
  ring: string
  sidebarActiveBg: string
  sidebarActiveText: string
}

export interface BrandConfig {
  light: BrandPalette
  dark: BrandPalette
}

export interface OgImageConfig {
  /** Background gradient start color (hex). Defaults to dark background from brand. */
  backgroundStart?: string
  /** Background gradient end color (hex). Defaults to dark muted from brand. */
  backgroundEnd?: string
  /** Accent color for top bar and decorative orbs (hex). Defaults to dark accent from brand. */
  accent?: string
  /** Title text color (hex). Defaults to dark foreground from brand. */
  titleColor?: string
  /** Description text color (hex). */
  descriptionColor?: string
  /** Group label text color (hex). Defaults to accent. */
  groupColor?: string
  /** Domain text shown in the bottom bar (e.g. "docs.example.com"). Defaults to NEXT_PUBLIC_SITE_URL hostname. */
  domain?: string
  /** Logo text displayed in the bottom bar. Defaults to site name. */
  logoText?: string
  /** Google Font family for the title. Defaults to "Inter". */
  fontFamily?: string
  /** Google Font weight for the title. Defaults to "700". */
  fontWeight?: string
}

export interface SiteConfig {
  name: string
  description: string
  repoUrl: string
  links: Array<SiteLink>
  brand: BrandConfig
  brandPreset: BrandPresetKey
  brandPresets: Record<BrandPresetKey, BrandConfig>
  /** Configuration for dynamic OG image generation. All fields are optional and fall back to brand colors. */
  ogImage?: OgImageConfig
}

const brandPresets: Record<BrandPresetKey, BrandConfig> = {
  primary: {
    light: {
      background: '#FFFFFF',
      foreground: '#0F172A',
      muted: '#F8FAFC',
      border: '#E2E8F0',
      accent: '#10B981',
      accentForeground: '#ECFEF3',
      ring: '#10B981',
      sidebarActiveBg: '152 60% 88% / 0.55',
      sidebarActiveText: '#0F172A',
    },
    dark: {
      background: '#0B1220',
      foreground: '#F8FAFC',
      muted: '#111827',
      border: '#1F2937',
      accent: '#34D399',
      accentForeground: '#0B1220',
      ring: '#34D399',
      sidebarActiveBg: '152 40% 30% / 0.35',
      sidebarActiveText: '#A7F3D0',
    },
  },
  secondary: {
    light: {
      background: '#FFFFFF',
      foreground: '#0F172A',
      muted: '#F5F3FF',
      border: '#E4E4F7',
      accent: '#8B5CF6',
      accentForeground: '#F5F3FF',
      ring: '#A855F7',
      sidebarActiveBg: '262 83% 90% / 0.5',
      sidebarActiveText: '#312E81',
    },
    dark: {
      background: '#0B1220',
      foreground: '#EDE9FE',
      muted: '#141129',
      border: '#1C1A2C',
      accent: '#C084FC',
      accentForeground: '#0B1220',
      ring: '#C084FC',
      sidebarActiveBg: '262 45% 32% / 0.3',
      sidebarActiveText: '#EDE9FE',
    },
  },
}

const brandPreset: BrandPresetKey = 'secondary'

export const siteConfig: SiteConfig = {
  name: 'Dox',
  description:
    'Dox is a Mintlify-style documentation template built on Next.js, Tailwind, Radix, and shadcn UI without inherited licensing constraints.',
  repoUrl: 'https://github.com/your-org/your-docs',
  links: [
    { label: 'Get started', href: '/quickstart' },
    { label: 'Support', href: 'https://github.com/kenny-io/Dox/issues/new' },
    { label: 'GitHub', href: 'https://github.com/your-org/your-docs' },
    { label: 'Changelog', href: '/changelog' },
  ],
  brand: brandPresets[brandPreset],
  brandPreset,
  brandPresets,
}

