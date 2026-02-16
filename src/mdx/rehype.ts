import type { Element, Root } from 'hast'
import shiki from 'shiki'
import { visit } from 'unist-util-visit'

let highlighter: Awaited<ReturnType<typeof shiki.getHighlighter>> | null = null

const languageAliases: Record<string, string> = {
  curl: 'bash',
  shell: 'bash',
}

function normalizeLanguage(language?: string) {
  if (!language) {
    return undefined
  }
  const normalized = language.toLowerCase()
  return languageAliases[normalized] ?? normalized
}

function rehypeParseCodeBlocks() {
  return (tree: Root) => {
    // @ts-expect-error -- unist-util-visit visitor types are stricter than needed
    visit(tree, 'element', (node: Element, _index: number | undefined, parent: Element | undefined) => {
      if (!parent || node.tagName !== 'code') {
        return
      }

      const className = node.properties?.className
      const languageClass =
        Array.isArray(className) && className.length > 0
          ? (className[0] as string)
          : typeof className === 'string'
            ? className
            : ''
      const language = normalizeLanguage(languageClass.replace(/^language-/, '') || 'txt')

      parent.properties = {
        ...parent.properties,
        language,
      }
    })
  }
}

function rehypeShiki() {
  return async (tree: Root) => {
    highlighter =
      highlighter ?? (await shiki.getHighlighter({ theme: 'css-variables' }))

    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'pre') {
        return
      }

      const [codeNode] = node.children
      if (!codeNode || (codeNode as Element).tagName !== 'code') {
        return
      }

      const [textNode] = (codeNode as Element).children as Array<{ type: string; value: string }>
      if (!textNode || typeof textNode.value !== 'string') {
        return
      }

      const code = textNode.value
      node.properties = {
        ...node.properties,
        code,
      }

      const language = node.properties?.language as string | undefined
      if (!language) {
        return
      }

      const tokens = highlighter!.codeToThemedTokens(code, language)
      textNode.value = shiki.renderToHtml(tokens, {
        elements: {
          pre: ({ children }) => children,
          code: ({ children }) => children,
          line: ({ children }) => `<span>${children}</span>`,
        },
      })
    })
  }
}

export const rehypePlugins = [rehypeParseCodeBlocks, rehypeShiki]

