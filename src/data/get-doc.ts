'use server'

import fs from 'node:fs/promises'
import path from 'node:path'
import type { ComponentType } from 'react'
import { compileMDX } from 'next-mdx-remote/rsc'
import type { DocEntry, OpenApiReference } from '@/data/docs'
import { deriveTitleFromSlug } from '@/data/docs'
import { remarkPlugins } from '@/mdx/remark'
import { rehypePlugins } from '@/mdx/rehype'
import { useMDXComponents as getMDXComponents } from '@/components/mdx/mdx-components'
import { resolveSnippetComponent } from '@/mdx/snippet-registry'

interface DocFrontmatter {
  title?: string
  description?: string
  group?: string
  badge?: string
  keywords?: Array<string>
  timeEstimate?: string
  lastUpdated?: string
  openapi?: string
}

const localDocsRoot = path.join(process.cwd(), 'src/content')

const dynamicDocCache = new Map<string, Promise<DocEntry | null>>()

export async function getDocFromParams(slugSegments?: Array<string>) {
  const normalized = Array.isArray(slugSegments) ? slugSegments.filter(Boolean) : []
  const slugKey = normalized.join('/')

  const cacheKey = slugKey
  let pending = dynamicDocCache.get(cacheKey)
  if (!pending) {
    pending = loadDocFromFilesystem(normalized)
    dynamicDocCache.set(cacheKey, pending)
  }

  return pending
}

async function loadDocFromFilesystem(
  slugSegments: Array<string>,
): Promise<DocEntry | null> {
  const slugPath = slugSegments.join('/')
  const candidate = await findDocSource(slugPath)
  if (!candidate) {
    return null
  }
  return compileDocEntry(candidate, slugSegments)
}

async function findDocSource(slugPath: string) {
  const normalized = slugPath || 'introduction'
  const candidates = normalized.endsWith('.mdx') ? [normalized] : [`${normalized}.mdx`, `${normalized}/index.mdx`]

  for (const candidate of candidates) {
    const filePath = path.join(localDocsRoot, candidate)
    try {
      await fs.access(filePath)
      return filePath
    } catch {
      // continue
    }
  }

  return null
}

async function compileDocEntry(filePath: string, slugSegments: Array<string>): Promise<DocEntry | null> {
  const source = await fs.readFile(filePath, 'utf8')
  const { cleanedSource, snippetInjectors } = extractSnippetComponents(source)
  const resolvedSnippetComponents: Record<string, ComponentType<Record<string, unknown>>> = {}
  for (const [name, resolver] of Object.entries(snippetInjectors)) {
    resolvedSnippetComponents[name] = (await resolver()) as ComponentType<Record<string, unknown>>
  }
  const components = getMDXComponents(resolvedSnippetComponents)
  const { content, frontmatter } = await compileMDX<DocFrontmatter>({
    source: cleanedSource,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins,
        rehypePlugins,
      },
    },
  })

  const slugPath = slugSegments.join('/')
  const href = slugPath ? `/${slugPath}` : '/'
  const GeneratedDoc: ComponentType<Record<string, unknown>> = function GeneratedDoc() {
    return content
  }
  GeneratedDoc.displayName = `DocContent(${href})`

  const openapi = parseOpenApiReference(frontmatter?.openapi)

  return {
    id: slugPath || frontmatter?.title || 'doc',
    title: frontmatter?.title ?? deriveTitleFromSlug(slugPath),
    description: frontmatter?.description ?? '',
    slug: slugSegments,
    href,
    group: frontmatter?.group ?? 'Docs',
    badge: frontmatter?.badge,
    keywords: frontmatter?.keywords ?? [],
    component: GeneratedDoc,
    timeEstimate: frontmatter?.timeEstimate ?? '5 min',
    lastUpdated: frontmatter?.lastUpdated ?? new Date().toISOString().slice(0, 10),
    openapi: openapi ?? undefined,
  }
}

const snippetImportPattern = /^\s*import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?\s*$/gm

function extractSnippetComponents(source: string) {
  const snippetInjectors: Record<string, () => Promise<ComponentType<Record<string, unknown>>>> = {}
  const cleanedSource = source.replace(snippetImportPattern, (statement, imports, fromPath) => {
    const normalizedPath = typeof fromPath === 'string' ? fromPath.trim() : ''
    if (!normalizedPath.startsWith('/snippets/')) {
      return statement
    }

    const names = imports
      .split(',')
      .map((name: string) => name.trim())
      .filter(Boolean)

    names.forEach((name: string) => {
      const loader = resolveSnippetComponent(normalizedPath, name)
      if (loader) {
        snippetInjectors[name] = loader
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn(`[docs] Unable to resolve snippet component "${name}" from "${normalizedPath}".`)
      }
    })

    return ''
  })

  return { cleanedSource, snippetInjectors }
}

function parseOpenApiReference(raw?: string): OpenApiReference | null {
  if (typeof raw !== 'string') {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length < 2) {
    return null
  }

  const method = parts[0]?.toUpperCase()
  const path = parts.slice(1).join(' ')
  if (!method || !path.startsWith('/')) {
    return null
  }

  return {
    specId: 'default',
    method,
    path,
  }
}

