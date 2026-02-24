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
  async redirects() {
    return docRedirects.map(({ source, destination, permanent = false }) => ({
      source,
      destination,
      permanent,
    }))
  },
}

export default nextConfig
