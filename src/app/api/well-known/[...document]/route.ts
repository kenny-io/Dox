import { type NextRequest } from 'next/server'
import { siteTools } from '@/lib/mcp/site-tools'

/**
 * Agent-discovery documents served under `/.well-known/*` (and `/auth.md`),
 * mapped here via rewrites in next.config.ts so every deployment emits
 * absolute URLs for its own origin — no per-site configuration needed.
 *
 * Everything published here describes capability the site actually has:
 * the MCP server at /api/mcp, the search API, Markdown content negotiation,
 * and the public no-auth read model. Standards covered:
 *  - RFC 9727 api-catalog (linkset)
 *  - MCP Server Card (/.well-known/mcp.json, /.well-known/mcp/server-card.json)
 *  - A2A Agent Card (/.well-known/agent-card.json)
 *  - Agent Skills discovery (/.well-known/agent-skills/*)
 *  - RFC 9728 OAuth Protected Resource Metadata
 *  - auth.md (agent-readable auth documentation)
 */

export const runtime = 'nodejs'

const JSON_TYPE = 'application/json; charset=utf-8'
const LINKSET_TYPE = 'application/linkset+json; charset=utf-8'
const MARKDOWN_TYPE = 'text/markdown; charset=utf-8'

function json(body: unknown, contentType: string = JSON_TYPE): Response {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'content-type': contentType, 'cache-control': 'public, max-age=300' },
  })
}

function markdown(body: string): Response {
  return new Response(body, {
    headers: { 'content-type': MARKDOWN_TYPE, 'cache-control': 'public, max-age=300' },
  })
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function apiCatalog(origin: string): Response {
  return json(
    {
      linkset: [
        {
          anchor: `${origin}/`,
          'service-desc': [
            { href: `${origin}/openapi.yaml`, type: 'application/yaml', title: 'OpenAPI description' },
          ],
          'service-doc': [
            { href: `${origin}/`, type: 'text/html', title: 'Documentation site' },
            { href: `${origin}/llms.txt`, type: 'text/markdown', title: 'llms.txt index for agents' },
          ],
          'service-meta': [
            { href: `${origin}/auth.md`, type: 'text/markdown', title: 'Authentication guide for agents' },
          ],
          item: [
            { href: `${origin}/api/mcp`, title: 'MCP server (streamable HTTP)' },
            { href: `${origin}/api/search`, title: 'Documentation search API' },
            { href: `${origin}/api/docs-index`, title: 'Machine-readable page index' },
          ],
        },
      ],
    },
    LINKSET_TYPE,
  )
}

function mcpServerCard(origin: string): Response {
  return json({
    name: 'dox-docs',
    title: 'Dox documentation MCP server',
    description:
      'Read-only MCP server exposing this documentation site: full-text search, page reads as Markdown, a page index, and an agent-readiness report.',
    version: '1.0.0',
    protocolVersion: '2025-06-18',
    url: `${origin}/api/mcp`,
    endpoint: `${origin}/api/mcp`,
    transport: ['streamable-http'],
    authentication: { type: 'none' },
    capabilities: { tools: { listChanged: false } },
    tools: siteTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    documentation: `${origin}/auth.md`,
  })
}

function a2aAgentCard(origin: string): Response {
  return json({
    protocolVersion: '0.3.0',
    name: 'Dox Docs Agent',
    description:
      'Documentation agent for this site. Answers questions from the docs corpus via search, Markdown page reads, and a machine-readable page index. Read-only and public.',
    url: `${origin}/api/mcp`,
    preferredTransport: 'JSONRPC',
    supportedInterfaces: [
      { url: `${origin}/api/mcp`, transport: 'JSONRPC', protocol: 'MCP' },
    ],
    version: '1.0.0',
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/markdown', 'application/json'],
    skills: siteTools.map((tool) => ({
      id: tool.name,
      name: tool.name,
      description: tool.description,
      tags: ['documentation', 'read-only'],
    })),
    documentationUrl: `${origin}/llms.txt`,
  })
}

function oauthProtectedResource(origin: string): Response {
  // RFC 9728. Honest shape for this site: the docs corpus and its agent
  // surfaces are public and unauthenticated; `authorization_servers` is
  // intentionally absent (it is OPTIONAL) because no OAuth server fronts
  // this resource. auth.md carries the human/agent-readable version.
  return json({
    resource: origin,
    resource_name: 'Dox documentation',
    bearer_methods_supported: [],
    resource_documentation: `${origin}/auth.md`,
  })
}

function authMd(origin: string): Response {
  return markdown(`# auth.md

This service supports agent access. Resource server: ${origin}. The agent
surface is public and read-only, so agent registration is instant and
implicit — no credential issuance, claim, or consent step exists.

## Discovery

Read this section first. This site is a public documentation site;
everything an agent needs is readable **without authentication**:

| Surface | Auth |
| --- | --- |
| Documentation pages (HTML or Markdown via \`Accept: text/markdown\`) | None |
| \`${origin}/llms.txt\` and \`${origin}/llms-full.txt\` | None |
| Search API — \`GET ${origin}/api/search?q=<query>\` | None |
| Page index — \`GET ${origin}/api/docs-index\` | None |
| MCP server — \`${origin}/api/mcp\` (streamable HTTP) | None |

## Registration

1. No registration is required. An agent may begin using every endpoint in
   the Discovery table immediately.
2. There is no registration endpoint, no client credential issuance, and no
   claim/verification step — requests need no \`Authorization\` header.
3. Identify honestly via \`User-Agent\` so rate limiting can be fair.

## Operation

Use the endpoints in the Discovery table directly. The MCP server at
\`${origin}/api/mcp\` accepts unauthenticated \`initialize\` and \`tools/call\`
requests over streamable HTTP.

## Rate limits

The MCP server applies a per-IP rate limit on tool calls. Well-behaved
agents will not hit it in normal use.

## Administrative surfaces

\`/admin\` and \`/api/admin/*\` are operator-only, session-authenticated, and
disallowed in \`robots.txt\`. They are not part of the agent surface, and no
agent credential exchange exists for them.
`)
}

// ---------------------------------------------------------------------------
// Agent Skills (https://agentskills.io discovery draft)
// ---------------------------------------------------------------------------

interface SkillDoc {
  name: string
  description: string
  body: (origin: string) => string
}

const SKILLS: Record<string, SkillDoc> = {
  'search-docs': {
    name: 'search-docs',
    description: 'Search this documentation site and retrieve ranked, cited results.',
    body: (origin) => `---
name: search-docs
description: Search this documentation site and retrieve ranked, cited results.
---

# Searching this documentation site

Query the search API directly:

\`\`\`
GET ${origin}/api/search?q=<query>&limit=8
\`\`\`

Returns JSON hits with \`title\`, \`url\`, and a matching snippet, ranked by
relevance. No authentication required. Prefer this over crawling pages.
`,
  },
  'read-page-markdown': {
    name: 'read-page-markdown',
    description: 'Fetch any documentation page as clean Markdown instead of HTML.',
    body: (origin) => `---
name: read-page-markdown
description: Fetch any documentation page as clean Markdown instead of HTML.
---

# Reading pages as Markdown

Every documentation page supports content negotiation. Request the page URL
with \`Accept: text/markdown\` to receive the page as Markdown:

\`\`\`
curl -H "Accept: text/markdown" ${origin}/<page-path>
\`\`\`

The full page index lives at \`${origin}/llms.txt\`; the entire corpus in one
file at \`${origin}/llms-full.txt\`.
`,
  },
  'connect-mcp': {
    name: 'connect-mcp',
    description: 'Attach an MCP client to this site and use its docs as native tools.',
    body: (origin) => `---
name: connect-mcp
description: Attach an MCP client to this site and use its docs as native tools.
---

# Connecting over MCP

This site runs a read-only MCP server (streamable HTTP, no auth):

\`\`\`
claude mcp add --transport http dox ${origin}/api/mcp
\`\`\`

Available tools: ${siteTools.map((tool) => `\`${tool.name}\``).join(', ')}.
`,
  },
}

function agentSkillsIndex(origin: string): Response {
  return json({
    version: '0.2.0',
    skills: Object.values(SKILLS).map((skill) => ({
      name: skill.name,
      description: skill.description,
      url: `${origin}/.well-known/agent-skills/${skill.name}.md`,
    })),
  })
}

function agentSkillFile(origin: string, file: string | null): Response {
  const name = (file ?? '').replace(/\.md$/, '')
  const skill = SKILLS[name]
  if (!skill) {
    return new Response('Skill not found', { status: 404, headers: { 'content-type': 'text/plain' } })
  }
  return markdown(skill.body(origin))
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ document: Array<string> }> },
): Promise<Response> {
  const { document } = await params
  const [name, arg] = document
  const origin = request.nextUrl.origin

  switch (name) {
    case 'api-catalog':
      return apiCatalog(origin)
    case 'mcp-server-card':
      return mcpServerCard(origin)
    case 'agent-card':
      return a2aAgentCard(origin)
    case 'oauth-protected-resource':
      return oauthProtectedResource(origin)
    case 'auth-md':
      return authMd(origin)
    case 'agent-skills-index':
      return agentSkillsIndex(origin)
    case 'agent-skills-file':
      return agentSkillFile(origin, arg ?? null)
    default:
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } })
  }
}
