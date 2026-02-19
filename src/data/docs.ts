import type { ComponentType } from 'react'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import docsNavigationConfig from '../../docs.json' assert { type: 'json' }

// ---------------------------------------------------------------------------
// Public interfaces (consumed by components, pages, and stores)
// ---------------------------------------------------------------------------

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
  openapi?: OpenApiReference
}

export interface OpenApiReference {
  specId: string
  method: string
  path: string
}

export interface NavigationSection {
  title: string
  items: Array<NavigationItem>
}

export interface SidebarCollection {
  id: string
  label: string
  sections: Array<NavigationSection>
  href?: string
  api?: DocsJsonApiConfig
}

export interface NavigationItem {
  id: string
  title: string
  href: string
  badge?: string
  description?: string
}

export interface SearchableDoc {
  id: string
  title: string
  description: string
  href: string
  keywords: Array<string>
}

// ---------------------------------------------------------------------------
// docs.json schema types
// ---------------------------------------------------------------------------

interface DocsJsonNavigationGroup {
  group: string
  pages: Array<string | DocsJsonNavigationGroup>
}

export interface DocsJsonApiConfig {
  source: string
  tagsOrder?: Array<string>
  defaultGroup?: string
  webhookGroup?: string
  overrides?: Record<string, {
    title?: string
    description?: string
    badge?: string
    group?: string
    slug?: Array<string>
    hidden?: boolean
  }>
}

interface DocsJsonTab {
  tab: string
  href?: string
  groups?: Array<DocsJsonNavigationGroup>
  api?: DocsJsonApiConfig
}

interface DocsJsonConfig {
  tabs: Array<DocsJsonTab>
}

// ---------------------------------------------------------------------------
// Content root & frontmatter cache
// ---------------------------------------------------------------------------

const CONTENT_ROOT = path.join(process.cwd(), 'src/content')
const docsConfig = docsNavigationConfig as unknown as DocsJsonConfig

interface FrontmatterData {
  title?: string
  description?: string
  badge?: string
  keywords?: Array<string>
  timeEstimate?: string
  lastUpdated?: string
  openapi?: string
}

const frontmatterCache = new Map<string, FrontmatterData>()

function readFrontmatter(pageId: string): FrontmatterData {
  if (frontmatterCache.has(pageId)) {
    return frontmatterCache.get(pageId)!
  }

  const candidates = [
    path.join(CONTENT_ROOT, `${pageId}.mdx`),
    path.join(CONTENT_ROOT, `${pageId}/index.mdx`),
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(raw)
      frontmatterCache.set(pageId, data as FrontmatterData)
      return data as FrontmatterData
    }
  }

  frontmatterCache.set(pageId, {})
  return {}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Placeholder: ComponentType<Record<string, unknown>> = () => null

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

function slugifyId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .replace(/\//g, '-')
}

function normalizeHref(pageId: string) {
  if (/^https?:\/\//i.test(pageId)) {
    return pageId
  }
  const slugSegments = pageId
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
  return slugSegments.length ? `/${slugSegments.join('/')}` : '/'
}

// ---------------------------------------------------------------------------
// Collect all page IDs from docs.json (for static params & search index)
// ---------------------------------------------------------------------------

function collectPageIds(groups: Array<DocsJsonNavigationGroup>): Array<string> {
  const ids: Array<string> = []
  for (const group of groups) {
    for (const page of group.pages) {
      if (typeof page === 'string') {
        ids.push(page)
      } else {
        ids.push(...collectPageIds([page]))
      }
    }
  }
  return ids
}

function buildDocEntryFromPageId(pageId: string): DocEntry {
  const fm = readFrontmatter(pageId)
  const slug = pageId === 'introduction' ? [] : pageId.split('/').filter(Boolean)
  const href = slug.length ? `/${slug.join('/')}` : '/'
  return {
    id: pageId,
    title: fm.title ?? deriveTitleFromSlug(pageId),
    description: fm.description ?? '',
    slug,
    href,
    group: '',
    badge: fm.badge,
    keywords: fm.keywords ?? [],
    component: Placeholder,
    timeEstimate: fm.timeEstimate ?? '5 min',
    lastUpdated: fm.lastUpdated ?? '',
  }
}

// ---------------------------------------------------------------------------
// Build entries from all tabs
// ---------------------------------------------------------------------------

let _allEntries: Array<DocEntry> | null = null

function getAllDocEntries(): Array<DocEntry> {
  if (_allEntries) return _allEntries

  const seen = new Set<string>()
  const entries: Array<DocEntry> = []

  for (const tab of docsConfig.tabs) {
    if (tab.groups) {
      for (const id of collectPageIds(tab.groups)) {
        if (!seen.has(id)) {
          seen.add(id)
          entries.push(buildDocEntryFromPageId(id))
        }
      }
    }
  }

  _allEntries = entries
  return entries
}

// ---------------------------------------------------------------------------
// Public query functions
// ---------------------------------------------------------------------------

export function getDocEntries(): Array<DocEntry> {
  return getAllDocEntries()
}

export function getDocEntryBySlug(slugPath: string): DocEntry | null
export function getDocEntryBySlug(languageCode: string, slugPath: string): DocEntry | null
export function getDocEntryBySlug(first: string, second?: string): DocEntry | null {
  const slugPath = second !== undefined ? second : first
  const entries = getAllDocEntries()
  return entries.find((doc) => doc.slug.join('/') === slugPath) ?? null
}

export function getSearchableDocs(): Array<SearchableDoc> {
  return getAllDocEntries().map((doc) => ({
    id: doc.id,
    title: doc.title,
    description: doc.description,
    href: doc.href,
    keywords: doc.keywords,
  }))
}

// ---------------------------------------------------------------------------
// Sidebar construction from docs.json
// ---------------------------------------------------------------------------

function resolveNavItem(pageId: string): NavigationItem {
  const fm = readFrontmatter(pageId)
  const slug = pageId === 'introduction' ? [] : pageId.split('/').filter(Boolean)
  const href = slug.length ? `/${slug.join('/')}` : '/'
  return {
    id: slugifyId(pageId) || 'introduction',
    title: fm.title ?? deriveTitleFromSlug(pageId),
    href,
    badge: fm.badge,
    description: fm.description,
  }
}

function buildNavigationSections(
  group: DocsJsonNavigationGroup,
  ancestors: Array<string> = [],
): Array<NavigationSection> {
  const titleSegments = [...ancestors, group.group].filter(Boolean)
  const title = titleSegments.length ? titleSegments.join(' • ') : 'General'

  const sections: Array<NavigationSection> = []
  let bufferedItems: Array<NavigationItem> = []

  group.pages.forEach((page) => {
    if (typeof page === 'string') {
      bufferedItems.push(resolveNavItem(page))
      return
    }

    if (bufferedItems.length) {
      sections.push({ title, items: bufferedItems })
      bufferedItems = []
    }

    sections.push(...buildNavigationSections(page, titleSegments))
  })

  if (bufferedItems.length) {
    sections.push({ title, items: bufferedItems })
  }

  return sections
}

let _sidebarCollections: Array<SidebarCollection> | null = null

export function getSidebarCollections(): Array<SidebarCollection> {
  if (_sidebarCollections) return _sidebarCollections

  _sidebarCollections = docsConfig.tabs.map((tab) => {
    const id = slugifyId(tab.tab) || tab.tab.toLowerCase()
    const groups = tab.groups ?? []
    const sections = groups.flatMap((group) => buildNavigationSections(group))

    return {
      id,
      label: tab.tab,
      sections,
      href: tab.href,
      api: tab.api,
    }
  })

  return _sidebarCollections
}

// ---------------------------------------------------------------------------
// Prev / Next navigation
// ---------------------------------------------------------------------------

export interface PrevNextLink {
  title: string
  href: string
}

export function getPrevNextLinks(currentHref: string): { prev: PrevNextLink | null; next: PrevNextLink | null } {
  const collections = getSidebarCollections()
  const flatPages: Array<{ title: string; href: string }> = []

  for (const collection of collections) {
    for (const section of collection.sections) {
      for (const item of section.items) {
        if (!flatPages.some((p) => p.href === item.href)) {
          flatPages.push({ title: item.title, href: item.href })
        }
      }
    }
  }

  const index = flatPages.findIndex((p) => p.href === currentHref)
  if (index === -1) {
    return { prev: null, next: null }
  }

  return {
    prev: index > 0 ? flatPages[index - 1] : null,
    next: index < flatPages.length - 1 ? flatPages[index + 1] : null,
  }
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function getBreadcrumbs(currentHref: string): Array<BreadcrumbItem> {
  const collections = getSidebarCollections()

  for (const collection of collections) {
    for (const section of collection.sections) {
      const match = section.items.find((item) => item.href === currentHref)
      if (match) {
        const crumbs: Array<BreadcrumbItem> = []
        // Tab level
        const firstPageHref = collection.sections[0]?.items[0]?.href
        crumbs.push({ label: collection.label, href: firstPageHref })
        // Group level (section title may contain " • " for nested groups)
        const groupParts = section.title.split(' • ')
        for (const part of groupParts) {
          crumbs.push({ label: part })
        }
        // Current page
        crumbs.push({ label: match.title })
        return crumbs
      }
    }
  }

  return []
}

// ---------------------------------------------------------------------------
// Pre-computed exports for client-side store defaults
// ---------------------------------------------------------------------------

export const sidebarCollections = getSidebarCollections()
export const searchableDocs = getSearchableDocs()

