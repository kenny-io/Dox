import type { MetadataRoute } from 'next'
import { getDocEntries } from '@/data/docs'
import { getAllApiOperationNodes } from '@/data/api-reference'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docEntries = getDocEntries()
  const apiNodes = await getAllApiOperationNodes()

  const docPages: MetadataRoute.Sitemap = docEntries.map((doc) => ({
    url: `${baseUrl}${doc.href}`,
    changeFrequency: 'weekly',
    priority: doc.href === '/' ? 1.0 : 0.7,
  }))

  const apiPages: MetadataRoute.Sitemap = apiNodes.map((node) => ({
    url: `${baseUrl}${node.href}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/changelog`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]

  return [...docPages, ...apiPages, ...staticPages]
}
