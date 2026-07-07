'use client'

import { useEffect } from 'react'

/**
 * WebMCP tool registration (W3C Web Model Context proposal).
 *
 * When the visiting user agent exposes `navigator.modelContext`, register the
 * site's docs surface as in-page tools so an agent driving the browser can
 * search and read the docs without scraping. Mirrors the tools the remote MCP
 * server at /api/mcp exposes, backed by the same public APIs. No-op in
 * browsers without the API.
 */

interface ModelContextTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  execute: (args: Record<string, unknown>) => Promise<unknown>
}

interface ModelContext {
  registerTool?: (tool: ModelContextTool) => unknown
  provideContext?: (context: { tools: Array<ModelContextTool> }) => unknown
}

function buildTools(): Array<ModelContextTool> {
  return [
    {
      name: 'search_docs',
      description:
        'Full-text search across all documentation pages on this site. Returns ranked matches with title, URL, and a snippet.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query.' },
          limit: { type: 'number', description: 'Maximum number of results (default 8, max 25).' },
        },
        required: ['query'],
      },
      async execute(args) {
        const query = typeof args.query === 'string' ? args.query : ''
        const limit = typeof args.limit === 'number' ? args.limit : 8
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
        )
        const text = await response.text()
        return { content: [{ type: 'text', text }] }
      },
    },
    {
      name: 'read_page',
      description:
        'Read a documentation page on this site as Markdown, by its URL path (e.g. "guides/getting-started").',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Page URL path relative to the site root.' },
        },
        required: ['path'],
      },
      async execute(args) {
        const path = typeof args.path === 'string' ? args.path.replace(/^\/+/, '') : ''
        const response = await fetch(`/${path}`, { headers: { accept: 'text/markdown' } })
        const text = await response.text()
        return { content: [{ type: 'text', text }] }
      },
    },
  ]
}

export function WebMcpTools() {
  useEffect(() => {
    const modelContext = (navigator as Navigator & { modelContext?: ModelContext }).modelContext
    if (!modelContext) return
    const tools = buildTools()
    try {
      if (typeof modelContext.registerTool === 'function') {
        for (const tool of tools) modelContext.registerTool(tool)
      } else if (typeof modelContext.provideContext === 'function') {
        modelContext.provideContext({ tools })
      }
    } catch {
      // Tool registration is progressive enhancement — never break the page.
    }
  }, [])

  return null
}
