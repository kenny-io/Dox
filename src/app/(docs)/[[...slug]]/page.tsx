import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocLayout } from '@/components/docs/doc-layout'
import { docsEntries } from '@/data/docs'
import { getDocFromParams } from '@/data/get-doc'

interface PageProps {
  params: Promise<{ slug?: Array<string> }>
}

export async function generateStaticParams() {
  return docsEntries.map((doc) => (doc.slug.length ? { slug: doc.slug } : {}))
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

  const Content = doc.component

  return (
    <DocLayout doc={doc}>
      <Content />
    </DocLayout>
  )
}

