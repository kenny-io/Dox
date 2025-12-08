import type {
  ApiSpecConfig,
  NormalizedMediaType,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedSecurityRequirement,
  NormalizedServer,
  NormalizedSpec,
  OperationOverride,
  ResolvedSpec,
} from '@/lib/openapi/types'

type RawObject = Record<string, unknown>

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const

export function buildOperationKey(method: string, path: string, isWebhook = false) {
  const prefix = isWebhook ? 'WEBHOOK ' : ''
  return `${prefix}${method.toUpperCase()} ${path}`
}

export function normalizeSpec(resolved: ResolvedSpec): NormalizedSpec {
  const specServers = normalizeServers((resolved.document as RawObject).servers)
  const resolveRef = createSchemaResolver(resolved.document as RawObject)
  const operations: Array<NormalizedOperation> = []

  const paths = (resolved.document as RawObject).paths
  if (paths && typeof paths === 'object') {
    Object.entries(paths as Record<string, RawObject>).forEach(([pathKey, pathItem]) => {
      const pathParameters = extractParameters(pathItem.parameters)
      const pathServers = normalizeServers(pathItem.servers)

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method]
        if (!operation || typeof operation !== 'object') {
          continue
        }
        operations.push(
          normalizeOperation({
            specId: resolved.config.id,
            path: pathKey,
            method,
            rawOperation: operation as RawObject,
            sharedParameters: pathParameters,
            pathServers,
            specServers,
            config: resolved.config,
            documentSecurity: (resolved.document as RawObject).security,
            isWebhook: false,
            resolveRef,
          }),
        )
      }
    })
  }

  const webhooks = (resolved.document as RawObject).webhooks
  if (webhooks && typeof webhooks === 'object') {
    Object.entries(webhooks as Record<string, RawObject>).forEach(([webhookKey, webhookItem]) => {
      const hookParameters = extractParameters(webhookItem.parameters)
      const hookServers = normalizeServers(webhookItem.servers)
      for (const method of HTTP_METHODS) {
        const operation = webhookItem[method]
        if (!operation || typeof operation !== 'object') {
          continue
        }
        operations.push(
          normalizeOperation({
            specId: resolved.config.id,
            path: webhookKey,
            method,
            rawOperation: operation as RawObject,
            sharedParameters: hookParameters,
            pathServers: hookServers,
            specServers,
            config: resolved.config,
            documentSecurity: (resolved.document as RawObject).security,
            isWebhook: true,
            resolveRef,
          }),
        )
      }
    })
  }

  operations.sort((a, b) => {
    if (a.group === b.group) {
      return a.title.localeCompare(b.title)
    }
    return a.group.localeCompare(b.group)
  })

  return {
    config: resolved.config,
    servers: specServers,
    operations,
  }
}

interface NormalizeOperationOptions {
  specId: string
  path: string
  method: (typeof HTTP_METHODS)[number]
  rawOperation: RawObject
  sharedParameters: Array<RawObject>
  pathServers: Array<NormalizedServer>
  specServers: Array<NormalizedServer>
  documentSecurity?: unknown
  config: ApiSpecConfig
  isWebhook: boolean
  resolveRef: (ref: string) => RawObject | null
}

function normalizeOperation(options: NormalizeOperationOptions): NormalizedOperation {
  const method = options.method.toUpperCase()
  const key = buildOperationKey(method, options.path, options.isWebhook)
  const override = options.config.operationOverrides?.[key]
  const title = override?.title ?? (options.rawOperation.summary as string | undefined) ?? (options.rawOperation.operationId as string | undefined) ?? `${method} ${options.path}`
  const description =
    override?.description ??
    (options.rawOperation.description as string | undefined) ??
    (options.rawOperation.summary as string | undefined)
  const tags = Array.isArray(options.rawOperation.tags)
    ? (options.rawOperation.tags.filter((tag): tag is string => typeof tag === 'string') as Array<string>)
    : []
  const group = resolveGroup({ tags, override, config: options.config, isWebhook: options.isWebhook })

  const pathLevelParameters = options.sharedParameters
  const operationParameters = extractParameters(options.rawOperation.parameters)
  const { groupedParameters, parameterPrefill } = normalizeParameters([...pathLevelParameters, ...operationParameters], options.resolveRef)
  const { body: requestBody, sample: requestBodySample } = normalizeRequestBody(options.rawOperation.requestBody, options.resolveRef)
  const responses = normalizeResponses(options.rawOperation.responses)
  const security = normalizeSecurity(options.rawOperation.security ?? options.documentSecurity)

  const operationServers = normalizeServers(options.rawOperation.servers)
  const servers =
    operationServers.length > 0
      ? operationServers
      : options.pathServers.length > 0
        ? options.pathServers
        : options.specServers

  const slug = override?.slug ?? buildSlugSegments(options.path, method, options.isWebhook)
  const id = buildOperationId(options.specId, slug, options.isWebhook)

  return {
    specId: options.specId,
    id,
    key,
    slug,
    title,
    description,
    method,
    path: options.path,
    isWebhook: options.isWebhook,
    group,
    badge: override?.badge,
    tags,
    servers,
    parameters: groupedParameters,
    requestBody,
    responses,
    security,
    hidden: override?.hidden ?? false,
    prefill: {
      path: parameterPrefill.path,
      query: parameterPrefill.query,
      header: parameterPrefill.header,
      cookie: parameterPrefill.cookie,
      body: requestBodySample,
    },
  }
}

function normalizeServers(raw: unknown): Array<NormalizedServer> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((server) => (server && typeof server === 'object' ? server : null))
    .filter((server): server is RawObject => Boolean(server && typeof server.url === 'string'))
    .map((server) => ({
      url: String(server.url),
      description: typeof server.description === 'string' ? server.description : undefined,
    }))
}

function extractParameters(raw: unknown): Array<RawObject> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter((param): param is RawObject => param !== null && typeof param === 'object')
}

function normalizeParameters(
  params: Array<RawObject>,
  resolveRef: (ref: string) => RawObject | null,
): {
  groupedParameters: Record<'path' | 'query' | 'header' | 'cookie', Array<NormalizedParameter>>
  parameterPrefill: Record<'path' | 'query' | 'header' | 'cookie', Record<string, string>>
} {
  const grouped: Record<'path' | 'query' | 'header' | 'cookie', Array<NormalizedParameter>> = {
    path: [],
    query: [],
    header: [],
    cookie: [],
  }
  const prefill: Record<'path' | 'query' | 'header' | 'cookie', Record<string, string>> = {
    path: {},
    query: {},
    header: {},
    cookie: {},
  }

  const deduped = new Map<string, RawObject>()
  params.forEach((param) => {
    if (typeof param.name !== 'string' || typeof param.in !== 'string') {
      return
    }
    const key = `${param.in}:${param.name}`
    if (!deduped.has(key)) {
      deduped.set(key, param)
    }
  })

  deduped.forEach((param) => {
    const location = param.in
    if (location === 'path' || location === 'query' || location === 'header' || location === 'cookie') {
      const normalizedParameter: NormalizedParameter = {
        name: param.name as string,
        in: location,
        required: Boolean(param.required),
        description: typeof param.description === 'string' ? param.description : undefined,
        schema: typeof param.schema === 'object' ? (param.schema as Record<string, unknown>) : undefined,
      }
      grouped[location].push(normalizedParameter)
      prefill[location][normalizedParameter.name] = buildParameterSampleValue(normalizedParameter.schema, resolveRef, normalizedParameter.required)
    }
  })

  return {
    groupedParameters: grouped,
    parameterPrefill: prefill,
  }
}

function normalizeRequestBody(
  raw: unknown,
  resolveRef: (ref: string) => RawObject | null,
): {
  body?: NormalizedRequestBody
  sample?: string
} {
  if (!raw || typeof raw !== 'object') {
    return { body: undefined, sample: undefined }
  }
  const contents = normalizeContent((raw as RawObject).content)
  if (!contents.length) {
    return { body: undefined, sample: undefined }
  }
  const primaryContent = contents[0]
  const sampleValue = primaryContent?.schema ? buildSchemaExample(primaryContent.schema, resolveRef) : undefined
  const sample = sampleValue !== undefined ? JSON.stringify(sampleValue, null, 2) : undefined

  return {
    body: {
      description: typeof (raw as RawObject).description === 'string' ? ((raw as RawObject).description as string) : undefined,
      required: Boolean((raw as RawObject).required),
      contents,
    },
    sample,
  }
}

function normalizeResponses(raw: unknown): Array<NormalizedResponse> {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  return Object.entries(raw as Record<string, RawObject>)
    .map(([code, response]) => ({
      code,
      description: typeof response.description === 'string' ? response.description : undefined,
      contents: normalizeContent(response.content),
    }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}

function normalizeContent(raw: unknown): Array<NormalizedMediaType> {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  return Object.entries(raw as Record<string, RawObject>).map(([mediaType, definition]) => ({
    mediaType,
    schema: typeof definition.schema === 'object' ? (definition.schema as Record<string, unknown>) : undefined,
    example: definition.example,
    examples: normalizeExamples(definition.examples),
  }))
}

function normalizeExamples(raw: unknown): Array<{ key: string; summary?: string; description?: string; value: unknown }> {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  return Object.entries(raw as Record<string, RawObject>)
    .map(([key, example]) => ({
      key,
      summary: typeof example.summary === 'string' ? example.summary : undefined,
      description: typeof example.description === 'string' ? example.description : undefined,
      value: 'value' in example ? example.value : example,
    }))
    .filter((example) => example.value !== undefined)
}

function normalizeSecurity(raw: unknown): Array<Array<NormalizedSecurityRequirement>> {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((requirement) => {
      if (!requirement || typeof requirement !== 'object') {
        return null
      }
      return Object.entries(requirement as Record<string, unknown>)
        .map(([name, scopes]) => ({
          name,
          scopes: Array.isArray(scopes) ? (scopes.filter((scope): scope is string => typeof scope === 'string') as Array<string>) : [],
        }))
        .filter((entry) => entry.name.length > 0)
    })
    .filter((group): group is Array<NormalizedSecurityRequirement> => Array.isArray(group) && group.length > 0)
}

function resolveGroup({
  tags,
  override,
  config,
  isWebhook,
}: {
  tags: Array<string>
  override?: OperationOverride
  config: ApiSpecConfig
  isWebhook: boolean
}) {
  if (override?.group) {
    return override.group
  }
  if (isWebhook) {
    return config.webhookGroup ?? 'Webhooks'
  }
  if (config.tagsOrder?.length) {
    const target = config.tagsOrder
      .map((tag) => tag.toLowerCase())
      .find((orderedTag) => tags.some((operationTag) => operationTag.toLowerCase() === orderedTag))
    if (target) {
      return tags.find((tag) => tag.toLowerCase() === target) ?? target
    }
  }
  if (tags.length > 0) {
    return tags[0]
  }
  return config.defaultGroup ?? 'Endpoints'
}

function buildSlugSegments(path: string, method: string, isWebhook: boolean): Array<string> {
  const cleaned = path
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[{}]/g, '').replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase())

  if (!cleaned.length) {
    cleaned.push('root')
  }

  if (isWebhook && cleaned[0] !== 'webhooks') {
    cleaned.unshift('webhooks')
  }

  cleaned.push(method.toLowerCase())
  return cleaned
}

function buildOperationId(specId: string, slug: Array<string>, isWebhook: boolean) {
  const prefix = isWebhook ? 'webhook' : 'endpoint'
  return [prefix, specId, ...slug].join('-').replace(/-+/g, '-')
}

function createSchemaResolver(document: RawObject) {
  return function resolveRef(ref: string): RawObject | null {
    if (typeof ref !== 'string' || !ref.startsWith('#/')) {
      return null
    }
    const pathSegments = ref
      .slice(2)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))

    let current: unknown = document
    for (const segment of pathSegments) {
      if (!current || typeof current !== 'object' || !(segment in (current as Record<string, unknown>))) {
        return null
      }
      current = (current as Record<string, unknown>)[segment]
    }
    return current && typeof current === 'object' ? (current as RawObject) : null
  }
}

function buildSchemaExample(schema: RawObject | undefined, resolveRef: (ref: string) => RawObject | null, seen = new Set<string>()): unknown {
  if (!schema) {
    return undefined
  }
  if (schema.example !== undefined) {
    return schema.example
  }
  if (schema.default !== undefined) {
    return schema.default
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0]
  }
  if (typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) {
      return undefined
    }
    seen.add(schema.$ref)
    const resolved = resolveRef(schema.$ref)
    if (resolved) {
      return buildSchemaExample(resolved, resolveRef, seen)
    }
  }
  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce<unknown>((acc, fragment) => {
      const sample = fragment && typeof fragment === 'object' ? buildSchemaExample(fragment as RawObject, resolveRef, new Set(seen)) : undefined
      if (Array.isArray(acc) || Array.isArray(sample)) {
        return sample ?? acc
      }
      if (typeof acc === 'object' && acc !== null && typeof sample === 'object' && sample !== null) {
        return { ...(acc as RawObject), ...(sample as RawObject) }
      }
      return sample ?? acc
    }, {})
  }

  const type = typeof schema.type === 'string' ? schema.type : undefined
  if (type === 'object' || schema.properties) {
    const properties = schema.properties && typeof schema.properties === 'object' ? (schema.properties as Record<string, RawObject>) : {}
    const result: Record<string, unknown> = {}
    Object.entries(properties).forEach(([key, value]) => {
      result[key] = buildSchemaExample(value, resolveRef, new Set(seen)) ?? ''
    })
    return result
  }
  if (type === 'array' && schema.items && typeof schema.items === 'object') {
    const sampleItem = buildSchemaExample(schema.items as RawObject, resolveRef, new Set(seen))
    return sampleItem !== undefined ? [sampleItem] : []
  }
  if (type === 'boolean') {
    return true
  }
  if (type === 'integer' || type === 'number') {
    return 0
  }
  return ''
}

function buildParameterSampleValue(
  schema: Record<string, unknown> | undefined,
  resolveRef: (ref: string) => RawObject | null,
  required: boolean,
): string {
  const value = schema ? buildSchemaExample(schema, resolveRef) : undefined
  if (value === undefined || value === null) {
    return required ? 'required-value' : ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

