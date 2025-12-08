import type { ComponentType } from 'react'
import docsNavigationConfig from '../../docs.json' assert { type: 'json' }
import Authentication from '@/content/docs/authentication.mdx'
import Customization from '@/content/docs/customization.mdx'
import Errors from '@/content/docs/errors.mdx'
import Introduction from '@/content/docs/introduction.mdx'
import Pagination from '@/content/docs/pagination.mdx'
import Quickstart from '@/content/docs/quickstart.mdx'
import Showcase from '@/content/docs/showcase.mdx'
import Sdks from '@/content/docs/sdks.mdx'
import Webhooks from '@/content/docs/webhooks.mdx'
import ApiReferenceGuide from '@/content/docs/api/reference.mdx'

export interface DocEntry {
  id: string
  title: string
  description: string
  slug: Array<string>
  href: string
  group: string
  badge?: string
  keywords: Array<string>
  component: ComponentType<Record<string, unknown>>
  timeEstimate: string
  lastUpdated: string
}

const entry = (config: Omit<DocEntry, 'href'>): DocEntry => ({
  ...config,
  href: config.slug.length ? `/${config.slug.join('/')}` : '/',
})

export const docsEntries: Array<DocEntry> = [
  entry({
    id: 'introduction',
    slug: [],
    title: 'Introduction',
    description: 'Overview of the Dox template architecture and guiding principles.',
    group: 'Overview',
    keywords: ['overview', 'dox', 'mintlify alternative'],
    component: Introduction,
    timeEstimate: '4 min',
    lastUpdated: '2024-12-01',
  }),
  entry({
    id: 'quickstart',
    slug: ['quickstart'],
    title: 'Quickstart',
    description: 'Spin up a fully functional documentation workspace in minutes.',
    group: 'Overview',
    keywords: ['setup', 'install'],
    component: Quickstart,
    timeEstimate: '6 min',
    lastUpdated: '2024-12-02',
  }),
  entry({
    id: 'authentication',
    slug: ['authentication'],
    title: 'Authentication',
    description: 'API key management, OAuth flows, and session hardening tips.',
    group: 'Core',
    keywords: ['oauth', 'api keys'],
    component: Authentication,
    timeEstimate: '5 min',
    lastUpdated: '2024-12-02',
  }),
  entry({
    id: 'pagination',
    slug: ['pagination'],
    title: 'Pagination',
    description: 'Cursor-based pagination semantics for every collection endpoint.',
    group: 'Core',
    keywords: ['pagination', 'cursor'],
    component: Pagination,
    timeEstimate: '3 min',
    lastUpdated: '2024-12-02',
  }),
  entry({
    id: 'webhooks',
    slug: ['webhooks'],
    title: 'Webhooks',
    description: 'Reliable events, signing strategies, and delivery guarantees.',
    group: 'Integrations',
    keywords: ['webhooks', 'events'],
    badge: 'beta',
    component: Webhooks,
    timeEstimate: '7 min',
    lastUpdated: '2024-12-03',
  }),
  entry({
    id: 'sdks',
    slug: ['sdks'],
    title: 'SDKs',
    description: 'Language SDKs with typed responses and ergonomic helpers.',
    group: 'Integrations',
    keywords: ['sdk', 'client'],
    component: Sdks,
    timeEstimate: '4 min',
    lastUpdated: '2024-12-03',
  }),
  entry({
    id: 'errors',
    slug: ['errors'],
    title: 'Errors',
    description: 'Consistent error payloads with trace IDs for debugging.',
    group: 'References',
    keywords: ['errors', 'debugging'],
    component: Errors,
    timeEstimate: '2 min',
    lastUpdated: '2024-12-03',
  }),
  entry({
    id: 'customization',
    slug: ['customization'],
    title: 'Customization',
    description: 'Modify spacing, panels, and typography via shared layout tokens.',
    group: 'Foundations',
    keywords: ['layout', 'theming'],
    component: Customization,
    timeEstimate: '3 min',
    lastUpdated: '2024-12-05',
  }),
  entry({
    id: 'showcase',
    slug: ['showcase'],
    title: 'Visual Regression Deck',
    description: 'Stress-test headings, callouts, and multi-language code blocks.',
    group: 'Foundations',
    keywords: ['testing', 'visual'],
    component: Showcase,
    timeEstimate: '4 min',
    lastUpdated: '2024-12-06',
  }),
  entry({
    id: 'api-reference',
    slug: ['api-reference'],
    title: 'API Reference Automation',
    description: 'Wire an OpenAPI spec into the docs shell with overrides and grouping.',
    group: 'References',
    keywords: ['openapi', 'reference'],
    component: ApiReferenceGuide,
    timeEstimate: '5 min',
    lastUpdated: '2024-12-07',
  }),
]

const docsConfig = docsNavigationConfig as DocsJsonConfig
export const docEntriesBySlug = new Map<string, DocEntry>()
docsEntries.forEach((doc) => {
  const key = doc.slug.join('/')
  docEntriesBySlug.set(key, doc)
})

export interface NavigationSection {
  title: string
  items: Array<NavigationItem>
}

export interface SidebarCollection {
  id: string
  label: string
  sections: Array<NavigationSection>
  href?: string
}

export interface NavigationItem {
  id: string
  title: string
  href: string
  badge?: string
  description?: string
}

interface DocsJsonNavigationGroup {
  group: string
  pages: Array<string | DocsJsonNavigationGroup>
}

interface DocsJsonNavigationTab {
  id?: string
  tab: string
  href?: string
  groups?: Array<DocsJsonNavigationGroup>
}

interface DocsJsonLanguage {
  language: string
  tabs: Array<DocsJsonNavigationTab>
}

interface DocsJsonConfig {
  navigation: {
    languages: Array<DocsJsonLanguage>
  }
}

const docIndex = new Map<string, DocEntry>()
docsEntries.forEach((doc) => {
  docIndex.set(doc.id, doc)
  const slugPath = doc.slug.join('/')
  if (slugPath && !docIndex.has(slugPath)) {
    docIndex.set(slugPath, doc)
  }
  if (!doc.slug.length) {
    docIndex.set('/', doc)
    docIndex.set('', doc)
  }
})

function resolveDocForNavigation(pageId: string): NavigationItem | null {
  const doc = docIndex.get(pageId) ?? docIndex.get(pageId.replace(/^\//, ''))
  if (doc) {
    return {
      id: doc.id,
      title: doc.title,
      href: doc.href,
      badge: doc.badge,
      description: doc.description,
    }
  }

  if (!pageId) {
    return null
  }

  const href = normalizeHref(pageId)

  return {
    id: slugifyId(pageId),
    title: deriveTitleFromSlug(pageId),
            href,
    description: '',
  }
}

function slugifyId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function normalizeHref(pageId: string) {
  if (/^https?:\/\//i.test(pageId)) {
    return pageId
  }
  return pageId.startsWith('/') ? pageId : `/${pageId}`
}

export function deriveTitleFromSlug(pageId: string) {
  const clean = pageId
    .split('/')
    .filter(Boolean)
    .pop()
  if (!clean) {
    return 'Overview'
  }
  return clean
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildNavigationSections(group: DocsJsonNavigationGroup, ancestors: Array<string> = []): Array<NavigationSection> {
  const titleSegments = [...ancestors, group.group].filter(Boolean)
  const title = titleSegments.length ? titleSegments.join(' • ') : 'General'

  const sections: Array<NavigationSection> = []
  let bufferedItems: Array<NavigationItem> = []

  group.pages.forEach((page) => {
    if (typeof page === 'string') {
      const item = resolveDocForNavigation(page)
      if (item) {
        bufferedItems.push(item)
      }
      return
    }

    if (bufferedItems.length) {
      sections.push({
        title,
        items: bufferedItems,
      })
      bufferedItems = []
    }

    sections.push(...buildNavigationSections(page, titleSegments))
  })

  if (bufferedItems.length) {
    sections.push({
      title,
      items: bufferedItems,
    })
  }

  return sections
}

function buildSidebarCollectionsFromDocsJson(languageCode = 'en'): Array<SidebarCollection> {
  const languages = docsConfig.navigation?.languages ?? []
  const languageConfig =
    languages.find((language) => language.language === languageCode) ?? languages[0]

  if (!languageConfig) {
    return []
  }

  return languageConfig.tabs.map((tab) => {
    const id = tab.id ?? slugifyId(tab.tab)
    const groups = tab.groups ?? []
    const sections = groups.flatMap((group) => buildNavigationSections(group))

    return {
      id,
      label: tab.tab,
      sections,
      href: tab.href,
    }
  })
}

export const sidebarCollections = buildSidebarCollectionsFromDocsJson()

export const searchableDocs = docsEntries.map((doc) => ({
  id: doc.id,
  title: doc.title,
  description: doc.description,
  href: doc.href,
  keywords: doc.keywords,
}))

