import type { ComponentType } from 'react'

type Registry = Record<string, Record<string, () => Promise<ComponentType<Record<string, unknown>>>>>

function loadSnippetComponent(importer: () => Promise<{ [key: string]: ComponentType<Record<string, unknown>> }>, exportName: string) {
  return async () => {
    const mod = await importer()
    const Component = mod[exportName]
    if (!Component) {
      throw new Error(`Snippet component "${exportName}" was not found in module.`)
    }
    return Component
  }
}

const registry: Registry = {
  '/snippets/evm-tools.jsx': {
    EvmTools: loadSnippetComponent(() => import('../../../lifi-docs/snippets/evm-tools.jsx'), 'EvmTools'),
  },
  '/snippets/contract-addresses.jsx': {
    ContractAddresses: loadSnippetComponent(() => import('../../../lifi-docs/snippets/contract-addresses.jsx'), 'ContractAddresses'),
  },
  '/snippets/supported-chains.jsx': {
    SupportedChains: loadSnippetComponent(() => import('../../../lifi-docs/snippets/supported-chains.jsx'), 'SupportedChains'),
  },
  '/snippets/supported-tools.jsx': {
    SupportedTools: loadSnippetComponent(() => import('../../../lifi-docs/snippets/supported-tools.jsx'), 'SupportedTools'),
  },
}

export function resolveSnippetComponent(path: string, name: string) {
  const loader = registry[path]?.[name]
  return loader ?? null
}

