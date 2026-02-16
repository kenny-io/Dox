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

const registry: Registry = {}

export function resolveSnippetComponent(path: string, name: string) {
  const loader = registry[path]?.[name]
  return loader ?? null
}

