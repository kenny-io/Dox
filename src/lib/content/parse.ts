import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import { toString as mdastToString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'
import type { Root, RootContent } from 'mdast'
import { slugify } from '@/lib/utils'
import type {
  ContentCodeBlock,
  ContentHeading,
  ContentLink,
  ContentTocItem,
  ParsedContent,
} from '@/lib/content/types'

// Single shared MDX → mdast parser. This is the one place content is parsed;
// every structured projection below is derived from the same tree.
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdx)

function parseToTree(markdown: string): Root {
  try {
    return processor.parse(markdown) as Root
  } catch {
    // Fall back to plain markdown parsing if MDX-specific syntax fails.
    return unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root
  }
}

function ensureUniqueId(base: string, seen: Map<string, number>): string {
  const slug = base || 'section'
  const count = seen.get(slug) ?? 0
  seen.set(slug, count + 1)
  return count === 0 ? slug : `${slug}-${count}`
}

function extractHeadings(tree: Root): Array<ContentHeading> {
  const headings: Array<ContentHeading> = []
  const seen = new Map<string, number>()

  visit(tree, 'heading', (node) => {
    const text = mdastToString(node).trim()
    if (!text) return
    headings.push({
      depth: node.depth,
      text,
      id: ensureUniqueId(slugify(text), seen),
    })
  })

  return headings
}

function buildToc(headings: Array<ContentHeading>): Array<ContentTocItem> {
  const toc: Array<ContentTocItem> = []
  const stack: Array<ContentTocItem> = []

  for (const heading of headings) {
    const item: ContentTocItem = { depth: heading.depth, text: heading.text, id: heading.id }
    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop()
    }
    if (stack.length === 0) {
      toc.push(item)
    } else {
      const parent = stack[stack.length - 1]
      parent.children = parent.children ?? []
      parent.children.push(item)
    }
    stack.push(item)
  }

  return toc
}

function extractCodeBlocks(tree: Root): Array<ContentCodeBlock> {
  const blocks: Array<ContentCodeBlock> = []
  let index = 0

  visit(tree, 'code', (node) => {
    const title = node.meta?.trim() || undefined
    blocks.push({
      language: node.lang || 'text',
      title,
      source: node.value.trimEnd(),
      index: index++,
    })
  })

  return blocks
}

function extractLinks(tree: Root): Array<ContentLink> {
  const links: Array<ContentLink> = []

  visit(tree, 'link', (node) => {
    const text = mdastToString(node).trim()
    links.push({ url: node.url, text })
  })

  return links
}

// Concatenate prose text, skipping fenced code blocks. Inline code is kept.
function extractText(tree: Root): string {
  const parts: Array<string> = []

  function walk(nodes: Array<RootContent>) {
    for (const node of nodes) {
      if (node.type === 'code') continue
      if (node.type === 'text' || node.type === 'inlineCode') {
        if ('value' in node && node.value) parts.push(node.value)
        continue
      }
      if ('children' in node && Array.isArray(node.children)) {
        walk(node.children as Array<RootContent>)
        // Add a soft break after block-level containers for readability.
        if (
          node.type === 'paragraph' ||
          node.type === 'heading' ||
          node.type === 'listItem' ||
          node.type === 'blockquote' ||
          node.type === 'tableRow'
        ) {
          parts.push('\n')
        }
      }
    }
  }

  walk(tree.children)

  return parts
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const JSX_WRAPPER_PATTERN =
  /<\/?(?:Steps|Step|Tabs|Tab|Note|Callout|CodeGroup|CardGroup|Card|Frame|Accordion|Columns|Tooltip)[^>]*>/g

function cleanMarkdown(markdown: string): string {
  return markdown.replace(JSX_WRAPPER_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Parse an MDX body into the typed content graph. This is the single source of
 * truth for all structured representations of a document.
 */
export function parseMdxContent(markdown: string): ParsedContent {
  const tree = parseToTree(markdown)
  const headings = extractHeadings(tree)

  return {
    headings,
    toc: buildToc(headings),
    codeBlocks: extractCodeBlocks(tree),
    links: extractLinks(tree),
    text: extractText(tree),
    markdown: cleanMarkdown(markdown),
  }
}
