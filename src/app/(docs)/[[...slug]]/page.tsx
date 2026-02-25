import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocLayout } from '@/components/docs/doc-layout'
import { getDocEntries, getI18nConfig } from '@/data/docs'
import { getDocFromParams } from '@/data/get-doc'
import { getApiOperationByKey } from '@/data/api-reference'
import { DocHeader } from '@/components/docs/doc-header'
import { ApiLayout } from '@/components/api/api-layout'
import { OperationPanel } from '@/components/api/operation-panel'
import { buildOgImageUrl } from '@/lib/og'

function localizedHref(href: string, code: string, defaultLocale: string) {
  return code === defaultLocale ? href : `/${code}${href}`
}

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const primaryHref = doc.slug.length ? `/${doc.slug.join('/')}` : '/'
  const i18n = getI18nConfig()

  const ogImageUrl = buildOgImageUrl({
    title: doc.title,
    description: doc.description,
    group: doc.group,
  })

  const alternateLanguages = i18n
    ? Object.fromEntries(
        i18n.locales.map((l) => [l.code, `${siteUrl}${localizedHref(primaryHref, l.code, i18n.defaultLocale)}`]),
      )
    : {}

  const isNoindex = doc.noindex || doc.hidden

  return {
    title: doc.title,
    description: doc.description,
    ...(isNoindex ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical: `${siteUrl}${primaryHref}`,
      ...(i18n ? { languages: alternateLanguages } : {}),
      types: {
        'application/json': `${siteUrl}${primaryHref}?format=json`,
      },
    },
    openGraph: {
      title: doc.title,
      description: doc.description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: doc.title,
      description: doc.description,
      images: [ogImageUrl],
    },
  }
}

export default async function DocsPage({ params }: PageProps) {
  const resolved = await params
  const doc = await getDocFromParams(resolved.slug)

  if (!doc) {
    notFound()
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const primaryHref = doc.slug.length ? `/${doc.slug.join('/')}` : '/'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    name: doc.title,
    description: doc.description || undefined,
    url: `${siteUrl}${primaryHref}`,
    identifier: doc.id,
    ...(doc.lastUpdated ? { dateModified: doc.lastUpdated } : {}),
    isPartOf: { '@type': 'WebSite', url: siteUrl },
  }

  if (doc.openapi) {
    const operationNode = await getApiOperationByKey(doc.openapi.method, doc.openapi.path, doc.openapi.specId)
    if (!operationNode) {
      notFound()
    }

    return (
      <div className="space-y-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Content />
    </DocLayout>
  )
}

