import { type NextRequest } from 'next/server'
import { getDocEntries, getSidebarCollections } from '@/data/docs'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(_request: NextRequest) {
  const entries = getDocEntries()
  const collections = getSidebarCollections()

  // Build a lookup: href → { tab, group }
  const hrefToNav = new Map<string, { tab: string; group: string }>()
  for (const collection of collections) {
    for (const section of collection.sections) {
      for (const item of section.items) {
        const parts = section.title.split(' • ')
        hrefToNav.set(item.href, {
          tab: collection.label,
          group: parts[parts.length - 1] ?? section.title,
        })
      }
    }
  }

  const pages = entries
    .filter((e) => !e.noindex && !e.hidden)
    .map((e) => {
      const nav = hrefToNav.get(e.href)
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        url: `${baseUrl}${e.href}`,
        api_url: `${baseUrl}/api/docs/${e.id}`,
        tab: nav?.tab ?? '',
        group: nav?.group ?? '',
        ...(e.badge ? { badge: e.badge } : {}),
        ...(e.keywords.length ? { keywords: e.keywords } : {}),
      }
    })

  return Response.json(
    {
      schema_version: '1',
      as_of: new Date().toISOString(),
      total: pages.length,
      pages,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
