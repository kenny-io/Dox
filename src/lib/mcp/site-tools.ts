import { searchDocs } from '@/lib/search/engine'
import { getContentDocument } from '@/lib/content'
import { getDocEntries } from '@/data/docs'
import { computeAgentReadiness } from '@/lib/agent-readiness'
import { getSiteUrl } from '@/lib/site-url'

/**
 * The tools the remote MCP endpoint (A6) exposes to any attached agent. Unlike
 * the `packages/mcp` tools (which operate on a local project directory), these
 * run against the deployed site's own content engine — so an agent attached over
 * HTTP reads exactly what the site serves.
 */
export interface McpTool {
  name: string
  description: string
  /** JSON Schema for the tool's arguments (always an object, per MCP spec). */
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>) => Promise<string>
}

const siteUrl = getSiteUrl()

export const siteTools: Array<McpTool> = [
  {
    name: 'search_docs',
    description:
      'Full-text search across all documentation pages. Returns ranked matches with title, URL, and a snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query.' },
        limit: { type: 'number', description: 'Maximum number of results (default 8, max 25).' },
      },
      required: ['query'],
    },
    handler: async (args) => {
      const query = String(args.query ?? '').trim()
      if (!query) return 'Provide a non-empty "query".'
      const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, Math.floor(args.limit)), 25) : 8
      // Full-text only: hybrid mode embeds the query per call — too costly for a
      // public, anonymous endpoint. Rate-limited on top of this.
      const hits = await searchDocs(query, { limit, mode: 'fulltext' })
      if (hits.length === 0) return `No results for "${query}".`
      return hits
        .map((hit, i) => `${i + 1}. ${hit.title} — ${siteUrl}${hit.href}\n   ${hit.snippet}`)
        .join('\n\n')
    },
  },
  {
    name: 'read_page',
    description: 'Read the full Markdown content of a documentation page by its page ID or URL path.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'Page ID or URL path, e.g. "guides/authentication".',
        },
      },
      required: ['pageId'],
    },
    handler: async (args) => {
      const raw = String(args.pageId ?? '')
        .trim()
        .replace(/^\//, '')
      if (!raw) return 'Provide a "pageId".'
      // Resolve to a KNOWN entry only — never pass the raw arg to the content
      // resolver, which path.joins it under CONTENT_ROOT (a "../" would escape
      // and read arbitrary .mdx files on the public endpoint).
      const entry = getDocEntries().find((e) => e.id === raw || e.slug.join('/') === raw)
      if (!entry) return `No page found for "${raw}". Call list_pages to see valid page IDs.`
      const doc = getContentDocument(entry.id)
      if (!doc) return `No page found for "${raw}". Call list_pages to see valid page IDs.`
      return doc.content.markdown
    },
  },
  {
    name: 'list_pages',
    description: 'List every documentation page with its ID, title, and URL.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const entries = getDocEntries()
      if (entries.length === 0) return 'This site has no documentation pages yet.'
      return entries.map((e) => `- ${e.id} — ${e.title} (${siteUrl}${e.href})`).join('\n')
    },
  },
  {
    name: 'agent_readiness',
    description:
      "Get this site's Agent Readiness Score (0-100) — a deterministic measure of how well the docs serve AI agents, with per-signal subscores.",
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const report = computeAgentReadiness()
      const lines = [
        `Agent Readiness: ${report.score}/100 (grade ${report.grade}) across ${report.totalPages} page${report.totalPages === 1 ? '' : 's'}.`,
        '',
      ]
      for (const sub of report.subscores) {
        lines.push(
          `- ${sub.label}: ${Math.round(sub.score * 100)}% (weight ${Math.round(sub.weight * 100)}%) — ${sub.detail}`,
        )
      }
      return lines.join('\n')
    },
  },
]

export function getSiteTool(name: string): McpTool | undefined {
  return siteTools.find((tool) => tool.name === name)
}
