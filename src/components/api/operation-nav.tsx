'use client'

import Link from 'next/link'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import type { ApiNavigationGroup } from '@/data/api-reference'
import { getMethodToken } from '@/components/api/tokens'
import { cn } from '@/lib/utils'

const methodFilterParser = parseAsStringEnum(['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE']).withDefault('ALL')

interface OperationNavProps {
  navigation: Array<ApiNavigationGroup>
  activeOperationId: string
  variant?: 'sidebar' | 'drawer'
  className?: string
}

export function OperationNav({ navigation, activeOperationId, variant = 'sidebar', className }: OperationNavProps) {
  const [methodFilter, setMethodFilter] = useQueryState('method', methodFilterParser)

  const operations = navigation.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      group: group.title,
    })),
  )

  const filteredOperations =
    methodFilter === 'ALL' ? operations : operations.filter((operation) => operation.method === methodFilter)

  const methods = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  const isDrawer = variant === 'drawer'

  return (
    <div
      className={cn(
        'space-y-5 rounded-2xl border border-border/40 p-4',
        isDrawer ? 'bg-transparent shadow-none' : 'bg-background/70 shadow-sm',
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Filter by method</p>
          {isDrawer ? <span className="text-[11px] uppercase text-foreground/50">Filters</span> : null}
        </div>
        <div className={cn('flex flex-wrap gap-2', isDrawer && 'overflow-x-auto')}>
          {methods.map((method) => {
            const token = getMethodToken(method === 'ALL' ? '' : method)
            const active = methodFilter === method
            return (
              <button
                key={method}
                type="button"
                onClick={() => setMethodFilter(method)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
                  active ? `${token.bg} ${token.text}` : 'bg-muted/20 text-foreground/70 hover:bg-muted/50',
                )}
              >
                {method}
              </button>
            )
          })}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Operations</p>
        <div className={cn('space-y-1', isDrawer ? 'max-h-[320px] overflow-y-auto pr-2' : 'max-h-[60vh] overflow-y-auto pr-1')}>
          {filteredOperations.map((operation) => {
            const active = operation.id === activeOperationId
            const token = getMethodToken(operation.method)
            return (
              <Link
                key={operation.id}
                href={operation.href}
                className={cn(
                  'block rounded-xl border border-border/30 p-3 transition hover:border-border/80',
                  active ? 'bg-muted/50' : 'bg-transparent',
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest', token.bg, token.text)}>
                      {operation.method}
                    </span>
                    <p className="text-sm font-semibold text-foreground">{operation.title}</p>
                  </div>
                  <p className="text-xs text-foreground/60">{operation.path}</p>
                </div>
              </Link>
            )
          })}
          {!filteredOperations.length ? <p className="text-xs text-foreground/50">No operations match this method.</p> : null}
        </div>
      </div>
    </div>
  )
}

