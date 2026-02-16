import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocLayout } from '@/components/docs/doc-layout'
import { getDocEntries } from '@/data/docs'
import { getDocFromParams } from '@/data/get-doc'
import { getApiOperationByKey } from '@/data/api-reference'
import { DocHeader } from '@/components/docs/doc-header'
import { ApiLayout } from '@/components/api/api-layout'
import { OperationPanel } from '@/components/api/operation-panel'

interface PageProps {
  params: Promise<{ slug?: Array<string> }>
}

export async function generateStaticParams() {
  const docs = getDocEntries()
  return docs.map((doc) =>
    doc.slug.length ? { slug: doc.slug } : {},
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const doc = await getDocFromParams(resolved.slug)
  if (!doc) {
    return {}
  }
  return {
    title: doc.title,
    description: doc.description,
  }
}

export default async function DocsPage({ params }: PageProps) {
  const resolved = await params
  const doc = await getDocFromParams(resolved.slug)

  if (!doc) {
    notFound()
  }

  if (doc.openapi) {
    const operationNode = await getApiOperationByKey(doc.openapi.method, doc.openapi.path, doc.openapi.specId)
    if (!operationNode) {
      notFound()
    }

    return (
      <div className="space-y-10">
        <div className="not-prose">
          <DocHeader doc={doc} />
        </div>
        <ApiLayout>
          <OperationPanel operation={operationNode.operation} />
        </ApiLayout>
      </div>
    )
  }

  const Content = doc.component

  return (
    <DocLayout doc={doc}>
      <Content />
    </DocLayout>
  )
}

