export interface ContentHeading {
  depth: number
  text: string
  id: string
}

export interface ContentTocItem {
  depth: number
  text: string
  id: string
  children?: Array<ContentTocItem>
}

export interface ContentCodeBlock {
  language: string
  source: string
  title?: string
  index: number
}

export interface ContentLink {
  url: string
  text: string
}

/**
 * The typed content graph for a single document, derived from a single MDX
 * parse. Every downstream representation (rendered HTML, structured JSON,
 * JSON-LD, Markdown, embedding chunks) is a projection of this object.
 */
export interface ParsedContent {
  headings: Array<ContentHeading>
  toc: Array<ContentTocItem>
  codeBlocks: Array<ContentCodeBlock>
  links: Array<ContentLink>
  /** Prose text with code blocks and JSX wrappers removed — for search/embeddings. */
  text: string
  /** Cleaned markdown body (frontmatter and known JSX wrappers stripped). */
  markdown: string
}
