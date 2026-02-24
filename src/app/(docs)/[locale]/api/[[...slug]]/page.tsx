import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ApiLayout } from '@/components/api/api-layout'
import { OperationPanel } from '@/components/api/operation-panel'
import { apiReferenceConfig } from '@/config/api-reference'
import { getAllApiOperationNodes, getApiOperationBySlug, getApiOperationNodes } from '@/data/api-reference'
import { getI18nConfig } from '@/data/docs'

interface PageProps {
  params: Promise<{ locale: string; slug?: Array<string> }>
}

function isValidSecondaryLocale(locale: string): boolean {
  const i18n = getI18nConfig()
  if (!i18n) return false
  return i18n.locales.some((l) => l.code === locale && l.code !== i18n.defaultLocale)
}

export async function generateStaticParams() {
  const i18n = getI18nConfig()
  if (!i18n) return []
  const secondaryLocales = i18n.locales.filter((l) => l.code !== i18n.defaultLocale)
  const nodes = await getAllApiOperationNodes()
  return secondaryLocales.flatMap(({ code }) =>
    nodes.map((node) => ({ locale: code, slug: node.slug })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  if (!isValidSecondaryLocale(resolved.locale)) return {}
  const node = await getApiOperationBySlug(resolved.slug)
  if (!node) return {}
  return {
    title: node.operation.title,
    description: node.operation.description ?? `${node.operation.method} ${node.operation.path}`,
  }
}

export default async function LocaleApiReferencePage({ params }: PageProps) {
  const resolved = await params

  if (!isValidSecondaryLocale(resolved.locale)) {
    notFound()
  }

  if (!resolved.slug?.length) {
    const defaultNodes = await getApiOperationNodes(apiReferenceConfig.defaultSpecId)
    if (defaultNodes.length > 0) {
      redirect(`/${resolved.locale}${defaultNodes[0].href}`)
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
