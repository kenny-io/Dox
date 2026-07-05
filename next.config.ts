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
  // Serve the dynamic brand favicon (admin upload → else the Dox default mark)
  // for the browser's automatic /favicon.ico request. We deleted the static
  // app/favicon.ico so Next's default icon can never win; this rewrite makes
  // sure a direct /favicon.ico hit still resolves to the right icon.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/api/brand/favicon' }]
  },
}

export default nextConfig
