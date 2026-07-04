import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  DOCS_ACCESS_COOKIE,
  getInternalAnalyticsSecretEdge,
  isAdminAuthenticatedEdge,
  isAdminEnabledEdge,
  isDocsAccessEnabledEdge,
  isDocsAccessGrantedEdge,
} from '@/lib/admin/auth-edge'
import { classifyRequest, isAgentRequest } from '@/lib/traffic-classifier'
import { isMachineEndpoint } from '@/lib/agent-endpoints'

function shouldTrackPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/analytics') ||
    pathname === '/api/search/track' ||
    pathname.startsWith('/api/access') ||
    pathname === '/access' ||
    pathname === '/icon' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp')
  ) {
    return false
  }
  return true
}

function buildAnalyticsPayload(request: NextRequest, pathname: string) {
  const classification = classifyRequest(request, pathname)
  const slugPath = pathname === '/' ? 'introduction' : pathname.slice(1).replace(/\.md$/, '')

  const isDiscovery =
    pathname === '/llms.txt' ||
    pathname === '/.well-known/llms.txt' ||
    pathname === '/llms-full.txt' ||
    pathname === '/ai.txt' ||
    pathname === '/api/docs-index'

  return {
    type: isDiscovery ? 'discovery' : pathname.startsWith('/api/') ? 'api_fetch' : 'page_view',
    path: pathname,
    slug: slugPath || undefined,
    visitorType: classification.visitorType,
    agentSignal: classification.agentSignal,
    format: classification.format,
    referer: request.headers.get('referer') ?? undefined,
  }
}

async function sendAnalyticsEvent(request: NextRequest, pathname: string) {
  if (!shouldTrackPath(pathname)) return

  const origin = request.nextUrl.origin
  const secret = getInternalAnalyticsSecretEdge()

  await fetch(`${origin}/api/analytics/collect`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dox-analytics-secret': secret,
    },
    body: JSON.stringify(buildAnalyticsPayload(request, pathname)),
  }).catch(() => {
    // analytics must never block requests
  })
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && isAdminEnabledEdge()) {
    const authed = await isAdminAuthenticatedEdge(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    if (!authed) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (
    isDocsAccessEnabledEdge() &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api/admin') &&
    !pathname.startsWith('/api/analytics') &&
    !pathname.startsWith('/api/access') &&
    pathname !== '/access' &&
    !pathname.startsWith('/_next') &&
    !(await isDocsAccessGrantedEdge(request.cookies.get(DOCS_ACCESS_COOKIE)?.value))
  ) {
    const accessUrl = request.nextUrl.clone()
    accessUrl.pathname = '/access'
    accessUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(accessUrl)
  }

  if (shouldTrackPath(pathname)) {
    event.waitUntil(sendAnalyticsEvent(request, pathname))
  }

  // `.md` page mirrors rewrite to the markdown API — but /skill.md and
  // /AGENTS.md are their own generated routes, so leave them alone.
  if (pathname.endsWith('.md') && pathname !== '/skill.md' && pathname !== '/AGENTS.md') {
    const slugPath = pathname.slice(1, -3)
    if (slugPath) {
      const url = request.nextUrl.clone()
      url.pathname = `/api/markdown/${slugPath}`
      return NextResponse.rewrite(url)
    }
  }

  if (isAgentRequest(request, pathname) && !isMachineEndpoint(pathname)) {
    const slugPath = pathname === '/' ? 'introduction' : pathname.slice(1)
    const format = request.nextUrl.searchParams.get('format')
    const url = request.nextUrl.clone()
    url.pathname = `/api/docs/${slugPath}`
    url.searchParams.delete('format')

    const requestHeaders = new Headers(request.headers)
    if (format === 'json' || format === 'ldjson' || format === 'md') {
      requestHeaders.set('x-dox-format', format)
    }

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Advertise the llms.txt discovery endpoint on HTML doc-page responses, so
  // agents and crawlers find the index without guessing. The `Link` header stays
  // relative (resolved against the request URL per RFC 8288); `X-Llms-Txt` is a
  // custom header agents read directly, so it carries an absolute URL. Only
  // content pages get the headers (not API/admin/_next).
  const response = NextResponse.next()
  if (!pathname.startsWith('/api') && !pathname.startsWith('/admin') && !pathname.startsWith('/_next')) {
    response.headers.append('Link', '</llms.txt>; rel="llms-txt"')
    response.headers.set('X-Llms-Txt', `${request.nextUrl.origin}/llms.txt`)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
