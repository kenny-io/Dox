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
  // libSQL ships a native binding; leave it as a runtime require so Next doesn't
  // try to bundle it (which breaks the analytics store on serverless builds).
  serverExternalPackages: ['@libsql/client'],
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
