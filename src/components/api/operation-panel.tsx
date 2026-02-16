'use client'

import { useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { ExamplePanel } from '@/components/api/example-panel'
import { SchemaViewer } from '@/components/api/schema-viewer'
import { TryItDialog } from '@/components/api/try-it-dialog'
import { OperationCodePanel } from '@/components/api/operation-code-panel'
import { useTryItController } from '@/components/api/use-try-it-controller'
import type { NormalizedOperation, NormalizedParameter, NormalizedResponse, NormalizedSecurityRequirement } from '@/lib/openapi/types'
import { getMethodToken } from '@/components/api/tokens'
import { cn } from '@/lib/utils'
import Markdown from '@/components/mdx/markdown'

interface OperationPanelProps {
  operation: NormalizedOperation
}

export function OperationPanel({ operation }: OperationPanelProps) {
  const controller = useTryItController(operation)
  const methodToken = getMethodToken(operation.method)
  const [isDialogOpen, setDialogOpen] = useState(false)

  const parameterGroups: Array<{ title: string; parameters: Array<NormalizedParameter> }> = [
    { title: 'Path parameters', parameters: operation.parameters.path },
    { title: 'Query parameters', parameters: operation.parameters.query },
    { title: 'Headers', parameters: operation.parameters.header },
    { title: 'Cookie parameters', parameters: operation.parameters.cookie },
  ].filter((group) => group.parameters.length > 0)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-10">
        <header className="space-y-6 rounded-3xl border border-border/20 bg-gradient-to-br from-background via-background to-muted/20 p-6 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">{operation.group}</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{operation.title}</h1>
              {operation.description ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none text-base text-foreground/70">
                  <Markdown>{operation.description}</Markdown>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/30 bg-background/60 px-4 py-3">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest', methodToken.bg, methodToken.text)}>{operation.method}</span>
            <code className="flex-1 text-sm font-semibold text-foreground break-all">
              {(operation.servers[0]?.url?.replace(/\/$/, '') ?? '')}
              {operation.path}
            </code>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent-foreground shadow hover:bg-accent/90"
            >
              Try it
            </button>
          </div>
        </header>
      {operation.servers.length ? (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Servers</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {operation.servers.map((server) => (
              <div key={server.url} className="rounded-xl border border-border/30 px-4 py-3">
                <p className="text-sm font-semibold text-foreground break-all">{server.url}</p>
                {server.description ? <p className="text-xs text-foreground/60">{server.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {parameterGroups.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Parameters</h2>
          <div className="space-y-4">
            {parameterGroups.map((group) => (
              <ParameterTable key={group.title} title={group.title} parameters={group.parameters} />
            ))}
          </div>
        </section>
      ) : null}

      {operation.requestBody ? (
        <section className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Request body</h2>
            {operation.requestBody.description ? <p className="text-sm text-foreground/70">{operation.requestBody.description}</p> : null}
          </div>
          <div className="space-y-4">
            {operation.requestBody.contents.map((content) => (
              <div key={content.mediaType} className="space-y-3 rounded-2xl border border-border/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{content.mediaType}</p>
                  <span className="text-xs uppercase tracking-[0.3em] text-foreground/60">
                    {operation.requestBody?.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                <SchemaViewer schema={content.schema} />
                <ExamplePanel title="Example" mediaType={content.mediaType} example={content.example} examples={content.examples} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {operation.responses.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Responses</h2>
          <Accordion.Root type="multiple" className="space-y-3">
            {operation.responses.map((response) => (
              <Accordion.Item key={response.code} value={response.code} className="overflow-hidden rounded-2xl border border-border/40">
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] uppercase tracking-widest text-foreground/70">
                        {response.code}
                      </span>
                      {response.description ?? 'Response'}
                    </span>
                    <span className="text-xs text-foreground/50">Toggle</span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="space-y-4 border-t border-border/30 px-4 py-4">
                  <ResponseContent response={response} />
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </section>
      ) : null}

      {operation.security.length ? (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Security</p>
          <div className="space-y-3">
            {operation.security.map((group, index) => (
              <div key={`${group.map((item) => item.name).join('-')}-${index}`} className="rounded-2xl border border-border/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">One of the following</p>
                <SecurityList requirements={group} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      </div>
      <OperationCodePanel controller={controller} />
      <TryItDialog controller={controller} open={isDialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

function ParameterTable({ title, parameters }: { title: string; parameters: Array<NormalizedParameter> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/40">
      <div className="flex items-center justify-between border-b border-border/30 bg-muted/20 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span className="text-xs text-foreground/60">
          {parameters.length} field{parameters.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-border/30">
        {parameters.map((parameter) => (
          <div key={`${parameter.in}-${parameter.name}`} className="space-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-sm text-foreground">{parameter.name}</code>
              <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] uppercase tracking-widest text-foreground/60">{parameter.in}</span>
              {parameter.required ? <span className="text-xs font-semibold uppercase text-rose-500">Required</span> : null}
            </div>
            {parameter.description ? (
              <Markdown className="prose prose-sm prose-neutral dark:prose-invert text-sm text-foreground/70">{parameter.description}</Markdown>
            ) : null}
            {parameter.schema ? <SchemaViewer schema={parameter.schema} /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResponseContent({ response }: { response: NormalizedResponse }) {
  if (!response.contents.length) {
    return <p className="text-sm text-foreground/60">This response does not declare any body content.</p>
  }
  return (
    <div className="space-y-4">
      {response.contents.map((content) => (
        <div key={content.mediaType} className="space-y-3 rounded-xl border border-border/40 p-3">
          <p className="text-sm font-semibold text-foreground">{content.mediaType}</p>
          <SchemaViewer schema={content.schema} />
          <ExamplePanel title="Example" mediaType={content.mediaType} example={content.example} examples={content.examples} />
        </div>
      ))}
    </div>
  )
}

function SecurityList({ requirements }: { requirements: Array<NormalizedSecurityRequirement> }) {
  return (
    <div className="space-y-2">
      {requirements.map((requirement) => (
        <div key={requirement.name} className="rounded-xl border border-border/40 p-3">
          <p className="text-sm font-semibold text-foreground">{requirement.name}</p>
          {requirement.scopes.length ? (
            <p className="text-xs text-foreground/60">Scopes: {requirement.scopes.join(', ')}</p>
          ) : (
            <p className="text-xs text-foreground/60">No scopes required</p>
          )}
        </div>
      ))}
    </div>
  )
}

