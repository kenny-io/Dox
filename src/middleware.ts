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
import { verifySession, SESSION_COOKIE } from '@/lib/auth/session'

function shouldTrackPath(pathname: string): boolean {
  // Admin console (pages + its own asset/nav requests) and Next internals are
  // never docs traffic.
  if (pathname.startsWith('/admin') || pathname.startsWith('/_next')) {
    return false
  }
  // Access gate, the generated icon, and static image assets.
  if (
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
  // For API routes, only agent fetches of DOC CONTENT count as api_fetch
  // traffic. Everything else under /api is infrastructure — brand assets
  // (brand.css/logo/favicon), site-config, chat-status, OG images, admin,
  // analytics — or an endpoint that already records its own event (search →
  // search_query, feedback → feedback, chat → chat_message). Counting those
  // as page/api "views" inflated human traffic on every single page load.
  if (pathname.startsWith('/api/')) {
    return pathname.startsWith('/api/docs') || pathname.startsWith('/api/markdown')
  }
  return true
}

// A prefetch/prerender is speculative — the browser fetches a link the user may
// never visit, so counting it as a view inflates traffic. We match the standard
// `Sec-Purpose`/`Purpose` request headers. (Next.js <Link> prefetches send
// `Next-Router-Prefetch`, but the framework strips that header before middleware
// can read it — verified — so those can't be caught here. Admin-page prefetches
// are instead excluded by isFromAdmin via the referer.)
function isPrefetchRequest(request: NextRequest): boolean {
  const secPurpose = request.headers.get('sec-purpose') ?? ''
  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true
  const purpose = (request.headers.get('purpose') ?? request.headers.get('x-purpose') ?? '').toLowerCase()
  return purpose === 'prefetch'
}

// Requests kicked off by the admin dashboard (its own data fetches to public
// endpoints, its link prefetches) carry an /admin referer. That's the owner
// operating the console, not docs traffic — don't count it.
function isFromAdmin(request: NextRequest): boolean {
  const referer = request.headers.get('referer')
  if (!referer) return false
  try {
    const path = new URL(referer).pathname
    return path === '/admin' || path.startsWith('/admin/')
  } catch {
    return false
  }
}

function shouldTrackRequest(request: NextRequest, pathname: string): boolean {
  return shouldTrackPath(pathname) && !isPrefetchRequest(request) && !isFromAdmin(request)
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
  if (!shouldTrackRequest(request, pathname)) return

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

  // Gate admin PAGES and admin APIs at the edge — except the public auth routes
  // (login/OIDC start/callback), which must be reachable pre-auth. This is
  // defense-in-depth so a new /api/admin/* route can't be reached unauthenticated
  // by forgetting its own requireCapability check.
  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const isAdminApi = pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')
  if ((isAdminPage || isAdminApi) && isAdminEnabledEdge()) {
    // Coarse, edge-safe check only: a valid break-glass password session OR a
    // valid signed OIDC identity cookie. The live role lookup happens in node.
    const passwordAuthed = await isAdminAuthenticatedEdge(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    const authed = passwordAuthed || Boolean(await verifySession(request.cookies.get(SESSION_COOKIE)?.value))
    if (!authed) {
      if (isAdminApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  if (shouldTrackRequest(request, pathname)) {
    event.waitUntil(sendAnalyticsEvent(request, pathname))
  }

  // `.md` page mirrors rewrite to the markdown API — but /skill.md, /AGENTS.md,
  // /auth.md, and Agent Skills files under /.well-known/ are their own
  // generated routes, so leave them alone.
  if (
    pathname.endsWith('.md') &&
    pathname !== '/skill.md' &&
    pathname !== '/AGENTS.md' &&
    pathname !== '/auth.md' &&
    !pathname.startsWith('/.well-known/')
  ) {
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
    // Standard relation types agents actually dereference (RFC 8288): the
    // Markdown alternate of the corpus, the OpenAPI description
    // (rel="service-desc", RFC 9727), and the API catalog (rel="api-catalog").
    response.headers.append('Link', '</llms.txt>; rel="alternate"; type="text/markdown"')
    response.headers.append('Link', '</openapi.yaml>; rel="service-desc"; type="application/yaml"')
    response.headers.append('Link', '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"')
    response.headers.set('X-Llms-Txt', `${request.nextUrl.origin}/llms.txt`)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
