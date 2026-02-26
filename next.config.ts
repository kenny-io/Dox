import type { NextConfig } from 'next'
import docsJson from './docs.json' assert { type: 'json' }

interface DocsRedirect {
  source: string
  destination: string
  permanent?: boolean
}

const docRedirects: Array<DocsRedirect> =
  (docsJson as { redirects?: Array<DocsRedirect> }).redirects ?? []

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx'],
  experimental: {
    externalDir: true,
  },
  // Include MDX content files in the serverless function bundle.
  // Without this, dynamic RSC navigation (e.g. navigating between tab route trees)
  // triggers a serverless render that can't find the content files via fs.
  outputFileTracingIncludes: {
    '/**': ['./src/content/**/*', './openapi.yaml'],
  },
  async redirects() {
    return docRedirects.map(({ source, destination, permanent = false }) => ({
      source,
      destination,
      permanent,
    }))
  },
}

export default nextConfig
