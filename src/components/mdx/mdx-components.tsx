import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Callout } from '@/components/mdx/callout'
import { Note } from '@/components/mdx/note'
import { Code, CodeGroup, Pre } from '@/components/mdx/code-blocks'
import { Accordion, Card, CardGroup, Columns, Frame, Icon, Tooltip } from '@/components/mdx/rich-content'
import { cn, slugify } from '@/lib/utils'

function flattenText(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (typeof node === 'object' && node && 'props' in node) {
    return flattenText((node as { props?: { children?: ReactNode } }).props?.children ?? '')
  }
  return ''
}

function createHeading(level: 2 | 3) {
  const Tag = `h${level}` as const
  return function Heading({ children }: { children: ReactNode }) {
    const text = flattenText(children)
    const id = slugify(text)
    return (
      <Tag
        id={id}
        data-heading={text}
        data-level={level}
        className={cn(
          'scroll-mt-24 font-semibold tracking-tight text-foreground',
          level === 2 ? 'mt-16 text-3xl' : 'mt-10 text-2xl',
        )}
      >
        <a href={`#${id}`} className="no-underline hover:underline">
          {children}
        </a>
      </Tag>
    )
  }
}

type CodeGroupProps = ComponentPropsWithoutRef<typeof CodeGroup>

const components: MDXComponents = {
  h2: createHeading(2),
  h3: createHeading(3),
  pre: (props) => <Pre {...(props as CodeGroupProps)} />,
  code: (props) => <Code {...props} />,
  CodeGroup: (props) => <CodeGroup {...(props as CodeGroupProps)} />,
  Info: (props) => <Note type="info" {...props} />,
  Warning: (props) => <Note type="warning" {...props} />,
  Error: (props) => <Note type="danger" {...props} />,
  Note: (props) => <Note {...props} />,
  Card: (props) => <Card {...props} />,
  CardGroup: (props) => <CardGroup {...props} />,
  Columns: (props) => <Columns {...props} />,
  Frame: (props) => <Frame {...props} />,
  Accordion: (props) => <Accordion {...props} />,
  Tooltip: (props) => <Tooltip {...props} />,
  Icon: (props) => <Icon {...props} />,
  table: ({ className, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-2xl border border-border">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
  th: (props) => <th className="border-b border-border/60 px-4 py-2 text-left text-xs uppercase tracking-wide text-foreground/70" {...props} />,
  td: (props) => <td className="border-b border-border/40 px-4 py-2 text-sm text-foreground/80" {...props} />,
}

export function useMDXComponents(existing: MDXComponents) {
  return {
    ...existing,
    ...components,
  }
}

