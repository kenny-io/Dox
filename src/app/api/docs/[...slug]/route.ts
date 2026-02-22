import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { type NextRequest } from 'next/server'
import { getDocEntries } from '@/data/docs'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const CONTENT_ROOT = path.join(process.cwd(), 'src/content')

function readRawContent(pageId: string): { frontmatter: Record<string, unknown>; content: string } | null {
  const candidates = [
    path.join(CONTENT_ROOT, `${pageId}.mdx`),
    path.join(CONTENT_ROOT, `${pageId}/index.mdx`),
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(raw)
      // Strip JSX component tags but keep their text content
      const cleaned = content
        .replace(/<\/?(?:Steps|Step|Tabs|Tab|Note|Callout|CodeGroup|CardGroup|Card|Frame|Accordion|Columns|Tooltip)[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      return { frontmatter: data, content: cleaned }
    }
  }

  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: Array<string> }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')

  // Find matching doc entry
  const entries = getDocEntries()
  const entry = entries.find((e) => e.slug.join('/') === slugPath || e.id === slugPath)

  if (!entry) {
    return new Response('# 404 — Page not found\n\nNo documentation page matches this path.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const result = readRawContent(entry.id)
  if (!result) {
    return new Response('# 404 — Content not found\n\nThe source file for this page could not be read.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const lines: Array<string> = []

  // YAML-style metadata header
  lines.push('---')
  lines.push(`title: ${entry.title}`)
  if (entry.description) lines.push(`description: ${entry.description}`)
  lines.push(`url: ${baseUrl}${entry.href}`)
  if (entry.lastUpdated) lines.push(`lastUpdated: ${entry.lastUpdated}`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${entry.title}`)
  lines.push('')
  if (entry.description) {
    lines.push(entry.description)
    lines.push('')
  }
  lines.push(result.content)

  const body = lines.join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
