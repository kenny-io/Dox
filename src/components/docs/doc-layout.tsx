import type { DocEntry } from '@/data/docs'
import { getBreadcrumbs, getPrevNextLinks } from '@/data/docs'
import { DocBreadcrumbs } from '@/components/docs/doc-breadcrumbs'
import { DocHeader } from '@/components/docs/doc-header'
import { DocPagination } from '@/components/docs/doc-pagination'
import { EditOnGithub } from '@/components/docs/edit-on-github'
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
  const breadcrumbs = getBreadcrumbs(doc.href)

  return (
    <MainColumns>
      <article className="flex-1">
        <ContentStack>
          <div className="not-prose space-y-4">
            <DocBreadcrumbs items={breadcrumbs} />
            <DocHeader doc={doc} />
          </div>
          <Prose className="flex-auto w-full">{children}</Prose>
          <div className="not-prose space-y-6">
            <Feedback />
            <EditOnGithub pageId={doc.id} />
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

