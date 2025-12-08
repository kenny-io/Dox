import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ApiLayout } from '@/components/api/api-layout'
import { OperationPanel } from '@/components/api/operation-panel'
import { apiReferenceConfig } from '@/config/api-reference'
import { getAllApiOperationNodes, getApiOperationBySlug, getApiOperationNodes } from '@/data/api-reference'

interface PageProps {
  params: Promise<{ slug?: Array<string> }>
}

export async function generateStaticParams() {
  const nodes = await getAllApiOperationNodes()
  return nodes.map((node) => ({ slug: node.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const node = await getApiOperationBySlug(resolved.slug)
  if (!node) {
    return {}
  }
  return {
    title: node.operation.title,
    description: node.operation.description ?? `${node.operation.method} ${node.operation.path}`,
  }
}

export default async function ApiReferencePage({ params }: PageProps) {
  const resolved = await params
  if (!resolved.slug?.length) {
    const defaultNodes = await getApiOperationNodes(apiReferenceConfig.defaultSpecId)
    if (defaultNodes.length > 0) {
      redirect(defaultNodes[0].href)
    }
    notFound()
  }

  const node = await getApiOperationBySlug(resolved.slug)
  if (!node) {
    notFound()
  }

  return (
    <ApiLayout>
      <OperationPanel operation={node.operation} />
    </ApiLayout>
  )
}

