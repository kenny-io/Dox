/**
 * Paths that are already terminal, machine-targeted endpoints and must be
 * served as-is — never rewritten to `/api/docs/{slug}` for agent requests.
 *
 * Without this guard, a bot User-Agent hitting `/ai.txt`, `/llms.txt`, or
 * `/api/docs-index` would be rewritten to `/api/docs/ai.txt` (etc.) and 404 —
 * which defeats the entire agent-discovery flow.
 */
export function isMachineEndpoint(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true

  const exact = new Set<string>([
    '/llms.txt',
    '/llms-full.txt',
    '/ai.txt',
    '/skill.md',
    '/AGENTS.md',
    '/sitemap.xml',
    '/robots.txt',
    '/openapi.json',
    '/openapi.yaml',
    '/changelog/rss.xml',
    '/icon',
  ])
  if (exact.has(pathname)) return true

  // Static assets and other non-HTML resources (incl. .md mirrors) resolve
  // themselves — never rewrite them to /api/docs/{slug}.
  return /\.(xml|txt|json|ya?ml|rss|md|png|jpe?g|svg|webp|ico|gif|css|js|map)$/.test(pathname)
}
