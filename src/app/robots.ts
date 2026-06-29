import type { MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const AGENT_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ClaudeBot',
  'GoogleOther',
  'PerplexityBot',
  'Meta-ExternalAgent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
] as const

const AGENT_ALLOW = [
  '/',
  '/llms.txt',
  '/llms-full.txt',
  '/ai.txt',
  '/api/docs',
  '/api/docs/',
  '/api/docs-index',
  '/openapi.yaml',
  '/openapi.json',
] as const

export default function robots(): MetadataRoute.Robots {
  const agentRules = AGENT_BOTS.map((userAgent) => ({
    userAgent,
    allow: [...AGENT_ALLOW],
  }))

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/llms.txt', '/llms-full.txt', '/ai.txt', '/api/docs/', '/api/docs-index', '/openapi.yaml'],
        disallow: ['/api/chat', '/api/feedback', '/api/og', '/api/try-it'],
      },
      ...agentRules,
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
