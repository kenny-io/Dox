import type { DocEntry } from '@/data/docs'
import { getPrevNextLinks } from '@/data/docs'
import { DocHeader } from '@/components/docs/doc-header'
import { DocPagination } from '@/components/docs/doc-pagination'
import { Feedback } from '@/components/docs/feedback'
import { TableOfContents } from '@/components/docs/table-of-contents'
import { ContentStack, DetailColumn, MainColumns } from '@/components/layout/sections'
import { Prose } from '@/components/mdx/prose'

interface DocLayoutProps {
  doc: DocEntry
  children: React.ReactNode
}

export function DocLayout({ doc, children }: DocLayoutProps) {
  const { prev, next } = getPrevNextLinks(doc.href)

  return (
    <MainColumns>
      <article className="flex-1">
        <ContentStack>
          <div className="not-prose">
            <DocHeader doc={doc} />
          </div>
          <Prose className="flex-auto w-full">{children}</Prose>
          <div className="not-prose">
            <Feedback />
            <DocPagination prev={prev} next={next} />
          </div>
        </ContentStack>
      </article>
      <DetailColumn>
        <TableOfContents />
      </DetailColumn>
    </MainColumns>
  )
}

