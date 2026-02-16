import type { ApiReferenceConfig, ApiSpecConfig } from '@/lib/openapi/types'
import { getSidebarCollections } from '@/data/docs'
import type { DocsJsonApiConfig } from '@/data/docs'

function buildApiReferenceConfig(): ApiReferenceConfig {
  const collections = getSidebarCollections()
  const apiCollection = collections.find((c) => c.api)
  const apiConfig = apiCollection?.api

  if (!apiConfig) {
    return { defaultSpecId: 'default', specs: [] }
  }

  return {
    defaultSpecId: 'default',
    specs: [buildSpecFromDocsJson(apiConfig)],
  }
}

function buildSpecFromDocsJson(api: DocsJsonApiConfig): ApiSpecConfig {
  const isUrl = api.source.startsWith('http://') || api.source.startsWith('https://')
  return {
    id: 'default',
    label: 'API Reference',
    source: isUrl
      ? { type: 'url', url: api.source }
      : { type: 'file', path: api.source },
    tagsOrder: api.tagsOrder,
    defaultGroup: api.defaultGroup,
    webhookGroup: api.webhookGroup,
    operationOverrides: api.overrides,
  }
}

export const apiReferenceConfig: ApiReferenceConfig = buildApiReferenceConfig()

