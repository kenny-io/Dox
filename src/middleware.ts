import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const KNOWN_BOT_UA = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'Gemini-Deep-Research',
  'GoogleOther',
  'python-requests',
  'node-fetch',
  'Go-http-client',
]

function detectAgentRequest(req: NextRequest): boolean {
  // Never treat Next.js App Router navigation or prefetch requests as agent requests.
  // These headers are only present in browser-initiated RSC navigations, not AI bots.
  if (
    req.headers.has('next-router-state-tree') ||
    req.headers.has('rsc') ||
    req.headers.has('next-router-prefetch')
  ) {
    return false
  }

  // 1. Explicit format override — highest priority
  const format = req.nextUrl.searchParams.get('format')
  if (format === 'json' || format === 'ldjson') return true

  // 2. Accept header content negotiation
  const accept = req.headers.get('accept') ?? ''
  if (accept.includes('application/json') || accept.includes('application/ld+json')) return true

  // 3. Explicit Dox client header
  if (req.headers.get('x-dox-client')?.toLowerCase() === 'agent') return true

  // 4. Known bot User-Agent strings
  const ua = req.headers.get('user-agent') ?? ''
  if (KNOWN_BOT_UA.some((b) => ua.includes(b))) return true

  return false
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rewrite .md paths to the markdown API
  if (pathname.endsWith('.md')) {
    const slugPath = pathname.slice(1, -3) // '/foo/bar.md' → 'foo/bar'
    if (slugPath) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/markdown/${slugPath}`
      return NextResponse.rewrite(url)
    }
  }

  // Rewrite agent requests to the structured docs API
  if (detectAgentRequest(request)) {
    const slugPath = pathname === '/' ? 'introduction' : pathname.slice(1)
    const url = request.nextUrl.clone()
    url.pathname = `/api/docs/${slugPath}`
    // Strip the format param — the API route handles it via Accept header
    url.searchParams.delete('format')
    return NextResponse.rewrite(url)
  }
}

export const config = {
  matcher: [
    // .md path rewrites (all depths)
    '/((?!_next/|api/).+\\.md$)',
    // Agent detection on all doc routes (excludes Next.js internals, API routes, static files)
    '/((?!_next/|api/|_vercel/|favicon|robots|sitemap|ai\\.txt).+)',
  ],
}
