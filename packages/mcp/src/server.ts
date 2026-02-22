import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { createProjectSchema, handleCreateProject } from './tools/create-project.js'
import { addPageSchema, handleAddPage } from './tools/add-page.js'
import { addTabSchema, handleAddTab } from './tools/add-tab.js'
import { listPagesSchema, handleListPages } from './tools/list-pages.js'
import { updatePageSchema, handleUpdatePage } from './tools/update-page.js'
import { migrateDocsSchema, handleMigrateDocs } from './tools/migrate-docs.js'
import { searchDocsSchema, handleSearchDocs } from './tools/search-docs.js'
import { readPageSchema, handleReadPage } from './tools/read-page.js'
import { getContextSchema, handleGetContext } from './tools/get-context.js'
import { lintProjectSchema, handleLintProject } from './tools/lint-project.js'

export function createServer(): McpServer {
  const server = new McpServer({
    name: '@dox/mcp',
    version: '0.1.0',
  })

  // Tool: create_project
  server.tool(
    'create_project',
    'Scaffold a new Dox documentation project from the GitHub template',
    createProjectSchema.shape,
    async (input) => {
      try {
        const text = await handleCreateProject(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: add_page
  server.tool(
    'add_page',
    'Add a new MDX page to a Dox project and register it in docs.json navigation',
    addPageSchema.shape,
    async (input) => {
      try {
        const text = await handleAddPage(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: add_tab
  server.tool(
    'add_tab',
    'Add a new top-level tab to a Dox project navigation (content tab or redirect link)',
    addTabSchema.shape,
    async (input) => {
      try {
        const text = await handleAddTab(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: list_pages
  server.tool(
    'list_pages',
    'List all pages in a Dox project, organized by tab and group',
    listPagesSchema.shape,
    async (input) => {
      try {
        const text = await handleListPages(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: update_page
  server.tool(
    'update_page',
    'Update the frontmatter or body content of an existing MDX page in a Dox project',
    updatePageSchema.shape,
    async (input) => {
      try {
        const text = await handleUpdatePage(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: migrate_docs
  server.tool(
    'migrate_docs',
    'Crawl a docs site and migrate it into a Dox project',
    migrateDocsSchema.shape,
    async (input) => {
      try {
        const text = await handleMigrateDocs(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: search_docs
  server.tool(
    'search_docs',
    'Search documentation pages by keyword — returns ranked list of matching pages',
    searchDocsSchema.shape,
    async (input) => {
      try {
        const text = await handleSearchDocs(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: read_page
  server.tool(
    'read_page',
    'Read the full content of a documentation page by its page ID',
    readPageSchema.shape,
    async (input) => {
      try {
        const text = await handleReadPage(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: get_context
  server.tool(
    'get_context',
    'Get the most relevant documentation context for a topic or question, within a token budget',
    getContextSchema.shape,
    async (input) => {
      try {
        const text = await handleGetContext(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  // Tool: lint_project
  server.tool(
    'lint_project',
    'Check a Dox project for issues: broken nav references, orphan files, missing frontmatter',
    lintProjectSchema.shape,
    async (input) => {
      try {
        const text = await handleLintProject(input)
        return { content: [{ type: 'text', text }] }
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : String(err))
      }
    },
  )

  return server
}
