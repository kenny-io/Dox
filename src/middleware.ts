import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.endsWith('.md')) {
    const slugPath = pathname.slice(1, -3) // '/foo/bar.md' → 'foo/bar'
    if (slugPath) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/markdown/${slugPath}`
      return NextResponse.rewrite(url)
    }
  }
}

export const config = {
  // Match any path ending in .md that isn't under _next/ or api/
  matcher: ['/((?!_next/|api/).+\\.md$)'],
}
