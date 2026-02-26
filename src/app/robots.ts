import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/api/docs/', '/api/docs-index'],
        disallow: ['/api/chat', '/api/feedback', '/api/og', '/api/try-it'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/api/docs', '/api/docs/', '/api/docs-index'],
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/api/docs', '/api/docs/', '/api/docs-index'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/api/docs', '/api/docs/', '/api/docs-index'],
      },
      {
        userAgent: 'GoogleOther',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/api/docs', '/api/docs/', '/api/docs-index'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
