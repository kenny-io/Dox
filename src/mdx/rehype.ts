import type { Element, Root } from 'hast'
import {
  createHighlighter,
  type Highlighter,
  type ThemedToken,
  type ThemeRegistration,
} from 'shiki'
import { visit } from 'unist-util-visit'

/**
 * A theme whose colors are CSS variables, so code blocks stay theme-aware via
 * the `--shiki-*` variables defined in globals.css. This replaces Shiki's old
 * built-in `css-variables` theme (removed in Shiki 1.0+) while keeping the exact
 * same variable contract, so no CSS changes are needed.
 */
const cssVariablesTheme: ThemeRegistration = {
  name: 'css-variables',
  type: 'dark',
  colors: {
    'editor.foreground': 'var(--shiki-color-text)',
    'editor.background': 'var(--shiki-color-background, transparent)',
  },
  fg: 'var(--shiki-color-text)',
  bg: 'var(--shiki-color-background, transparent)',
  settings: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: 'var(--shiki-token-comment)' } },
    { scope: ['string', 'constant.other.symbol'], settings: { foreground: 'var(--shiki-token-string)' } },
    { scope: ['constant.numeric', 'constant.language', 'constant', 'support.constant'], settings: { foreground: 'var(--shiki-token-constant)' } },
    { scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { foreground: 'var(--shiki-token-keyword)' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: 'var(--shiki-token-function)' } },
    { scope: ['variable.parameter', 'variable', 'meta.definition.variable'], settings: { foreground: 'var(--shiki-token-parameter)' } },
    { scope: ['punctuation', 'meta.brace', 'keyword.operator'], settings: { foreground: 'var(--shiki-token-punctuation)' } },
    { scope: ['meta.template.expression', 'string.template meta.embedded'], settings: { foreground: 'var(--shiki-token-string-expression)' } },
  ],
}

const FALLBACK_LANGUAGE = 'txt'

let highlighterPromise: Promise<Highlighter> | null = null

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [cssVariablesTheme],
      langs: [FALLBACK_LANGUAGE],
    })
  }
  return highlighterPromise
}

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

/**
 * Ensure a language grammar is loaded; fall back to plaintext for unknown or
 * unsupported languages so an exotic code fence never breaks the page.
 */
async function resolveLanguage(highlighter: Highlighter, language: string): Promise<string> {
  if (highlighter.getLoadedLanguages().includes(language)) {
    return language
  }
  try {
    await highlighter.loadLanguage(language as Parameters<Highlighter['loadLanguage']>[0])
    return language
  } catch {
    return FALLBACK_LANGUAGE
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])
}

/**
 * Render themed tokens to the same inner HTML the old Shiki `renderToHtml`
 * produced for this pipeline: one `<span>` per line wrapping per-token color
 * spans, with no `<pre>`/`<code>` wrapper (those already exist in the tree).
 */
function tokensToHtml(lines: Array<Array<ThemedToken>>): string {
  return lines
    .map((line) => {
      const inner = line
        .map((token) => `<span style="color:${token.color ?? 'inherit'}">${escapeHtml(token.content)}</span>`)
        .join('')
      return `<span>${inner}</span>`
    })
    .join('\n')
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
    const highlighter = await getHighlighter()

    // Collect <pre> nodes first so we can await per-node language loading.
    const targets: Array<{ node: Element; code: string; language: string; textNode: { value: string } }> = []

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

      targets.push({ node, code, language, textNode })
    })

    for (const target of targets) {
      const language = await resolveLanguage(highlighter, target.language)
      const lines = highlighter.codeToTokensBase(target.code, {
        lang: language as Parameters<Highlighter['codeToTokensBase']>[1]['lang'],
        theme: cssVariablesTheme,
      })
      target.textNode.value = tokensToHtml(lines)
    }
  }
}

export const rehypePlugins = [rehypeParseCodeBlocks, rehypeShiki]
