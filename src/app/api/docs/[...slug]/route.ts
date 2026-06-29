import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { type NextRequest } from 'next/server'
import { getDocEntries, getI18nConfig, getNavContext } from '@/data/docs'
import { buildDocPageJsonLd } from '@/lib/json-ld'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const CONTENT_ROOT = path.join(process.cwd(), 'src/content')

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

interface CodeBlock {
  language: string
  source: string
  title?: string
  index: number
}

interface Heading {
  depth: number
  text: string
  id: string
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function extractCodeBlocks(mdx: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  // Use [ \t]+ (horizontal whitespace only) so newline is never consumed as part of the title
  const fenceRe = /^```(\S*?)(?:[ \t]+(.+?))?[ \t]*\n([\s\S]*?)^```/gm
  let match: RegExpExecArray | null
  let index = 0
  while ((match = fenceRe.exec(mdx)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      title: match[2] ?? undefined,
      source: match[3].trimEnd(),
      index: index++,
    })
  }
  return blocks
}

function extractHeadings(mdx: string): Heading[] {
  // Strip code blocks first so `# comments` inside bash/json aren't matched as headings
  const withoutCode = mdx.replace(/^```[\s\S]*?^```/gm, '')
  const headings: Heading[] = []
  const headingRe = /^(#{1,6})\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = headingRe.exec(withoutCode)) !== null) {
    const text = match[2].replace(/\*\*|__|\*|_|`/g, '').trim()
    headings.push({ depth: match[1].length, text, id: slugifyHeading(text) })
  }
  return headings
}

interface TocItem {
  depth: number
  text: string
  id: string
  children?: TocItem[]
}

function buildToc(headings: Heading[]): TocItem[] {
  const toc: TocItem[] = []
  const stack: TocItem[] = []

  for (const h of headings) {
    const item: TocItem = { depth: h.depth, text: h.text, id: h.id }
    while (stack.length > 0 && stack[stack.length - 1].depth >= h.depth) {
      stack.pop()
    }
    if (stack.length === 0) {
      toc.push(item)
    } else {
      const parent = stack[stack.length - 1]
      parent.children = parent.children ?? []
      parent.children.push(item)
    }
    stack.push(item)
  }

  return toc
}

function stripProseText(mdx: string): string {
  return mdx
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove JSX component tags
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*>/g, '')
    // Remove markdown headings markers (keep text)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*|__|\*|_/g, '')
    // Remove markdown links — keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove standalone URLs
    .replace(/https?:\/\/\S+/g, '')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function readRawContent(
  pageId: string,
): { frontmatter: Record<string, unknown>; rawMdx: string; cleanedMdx: string } | null {
  const candidates = [
    path.join(CONTENT_ROOT, `${pageId}.mdx`),
    path.join(CONTENT_ROOT, `${pageId}/index.mdx`),
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(raw)
      // Cleaned MDX: strip JSX tags but preserve code blocks and text content
      const cleanedMdx = content
        .replace(
          /<\/?(?:Steps|Step|Tabs|Tab|Note|Callout|CodeGroup|CardGroup|Card|Frame|Accordion|Columns|Tooltip)[^>]*>/g,
          '',
        )
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      return { frontmatter: data, rawMdx: content, cleanedMdx }
    }
  }

  return null
}

function resolveRequestedFormat(request: NextRequest): 'json' | 'ldjson' | 'markdown' {
  const formatHeader = request.headers.get('x-dox-format')
  if (formatHeader === 'ldjson') return 'ldjson'
  if (formatHeader === 'json') return 'json'
  if (formatHeader === 'md') return 'markdown'

  const formatParam = request.nextUrl.searchParams.get('format')
  if (formatParam === 'ldjson') return 'ldjson'
  if (formatParam === 'json') return 'json'
  if (formatParam === 'md') return 'markdown'

  const accept = request.headers.get('accept') ?? ''
  if (accept.includes('application/ld+json')) return 'ldjson'
  if (accept.includes('application/json')) return 'json'
  if (accept.includes('text/markdown')) return 'markdown'

  return 'markdown'
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: Array<string> }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')
  const format = resolveRequestedFormat(request)
  const wantsJson = format === 'json'
  const wantsLdJson = format === 'ldjson'

  // Find matching doc entry
  const entries = getDocEntries()
  const entry = entries.find((e) => e.slug.join('/') === slugPath || e.id === slugPath)

  if (!entry) {
    if (wantsJson || wantsLdJson) {
      return Response.json(
        { error: 'not_found', message: 'No documentation page matches this path.' },
        { status: 404 },
      )
    }
    return new Response('# 404 — Page not found\n\nNo documentation page matches this path.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const result = readRawContent(entry.id)
  if (!result) {
    if (wantsJson || wantsLdJson) {
      return Response.json(
        { error: 'content_not_found', message: 'The source file for this page could not be read.' },
        { status: 404 },
      )
    }
    return new Response('# 404 — Content not found\n\nThe source file for this page could not be read.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const canonicalUrl = `${baseUrl}${entry.href}`
  const locale = getI18nConfig()?.defaultLocale ?? 'en'
  const nav = getNavContext(entry.id)
  const jsonLd = buildDocPageJsonLd({
    siteUrl: baseUrl,
    pageUrl: canonicalUrl,
    id: entry.id,
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
    lastUpdated: entry.lastUpdated,
    locale,
    breadcrumb: nav.breadcrumb,
  })

  const commonHeaders: Record<string, string> = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    Vary: 'Accept, X-Dox-Format',
    Link: `<${entry.href}>; rel="canonical", <${entry.href}?format=json>; rel="alternate"; type="application/json", <${entry.href}?format=ldjson>; rel="alternate"; type="application/ld+json"`,
  }

  // -------------------------------------------------------------------------
  // JSON-LD response
  // -------------------------------------------------------------------------
  if (wantsLdJson) {
    return new Response(JSON.stringify(jsonLd), {
      headers: {
        ...commonHeaders,
        'Content-Type': 'application/ld+json; charset=utf-8',
      },
    })
  }

  // -------------------------------------------------------------------------
  // JSON response
  // -------------------------------------------------------------------------
  if (wantsJson) {
    const { frontmatter, rawMdx, cleanedMdx } = result
    const headings = extractHeadings(cleanedMdx)
    const codeBlocks = extractCodeBlocks(rawMdx)
    const toc = buildToc(headings)

    const fm = frontmatter as Record<string, unknown>

    const payload = {
      schema_version: '1',

      // Identity
      id: entry.id,
      url: canonicalUrl,
      canonical_url: canonicalUrl,

      // Content
      title: entry.title,
      description: entry.description,
      content: {
        mdx: cleanedMdx,
        text: stripProseText(cleanedMdx),
        code_blocks: codeBlocks,
      },

      // Structure
      headings,
      toc,

      // Navigation
      nav: {
        tab: nav.tab,
        group: nav.group,
        prev: nav.prev,
        next: nav.next,
        breadcrumb: nav.breadcrumb,
      },

      // Metadata
      meta: {
        locale,
        keywords: entry.keywords,
        badge: entry.badge ?? undefined,
        mode: entry.mode ?? undefined,
        noindex: entry.noindex ?? undefined,
        lastUpdated: entry.lastUpdated || undefined,
        timeEstimate: entry.timeEstimate || undefined,
      },

      // schema.org structured data (same payload embedded in HTML pages)
      json_ld: jsonLd,

      // OpenAPI (when this page or its tab has a spec)
      ...(fm.openapi || entry.openapi
        ? {
            openapi: {
              spec_url: '/openapi.yaml',
              ...(entry.openapi ? { operations: [`${entry.openapi.method.toUpperCase()} ${entry.openapi.path}`] } : {}),
            },
          }
        : {}),

      // Freshness
      freshness: {
        as_of: new Date().toISOString(),
        cache_ttl_seconds: 3600,
      },
    }

    return Response.json(payload, {
      headers: commonHeaders,
    })
  }

  // -------------------------------------------------------------------------
  // Markdown response (default — backward compat)
  // -------------------------------------------------------------------------
  const lines: Array<string> = []

  lines.push('---')
  lines.push(`title: ${entry.title}`)
  if (entry.description) lines.push(`description: ${entry.description}`)
  lines.push(`url: ${canonicalUrl}`)
  if (entry.lastUpdated) lines.push(`lastUpdated: ${entry.lastUpdated}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${entry.title}`)
  lines.push('')
  if (entry.description) {
    lines.push(entry.description)
    lines.push('')
  }
  lines.push(result.cleanedMdx)

  return new Response(lines.join('\n'), {
    headers: {
      ...commonHeaders,
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
}
