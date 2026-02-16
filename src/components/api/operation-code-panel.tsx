import { Copy } from 'lucide-react'
import type { TryItController } from '@/components/api/use-try-it-controller'
import { ResponseBody } from '@/components/api/try-it-panel'
import { cn } from '@/lib/utils'

interface OperationCodePanelProps {
  controller: TryItController
}

export function OperationCodePanel({ controller }: OperationCodePanelProps) {
  const { preparedRequest, response } = controller

  return (
    <div className="space-y-6">
      <CodeBlock title="cURL" subtitle="Request" lines={preparedRequest.curlLines} disabled={!preparedRequest.isServerConfigured} />
      <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/60">Response</p>
          {response && 'status' in response ? (
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                response.status >= 200 && response.status < 300 ? 'bg-accent/10 text-accent' : 'bg-rose-500/10 text-rose-400',
              )}
            >
              {response.status}
            </span>
          ) : null}
        </div>
        {response && 'body' in response ? (
          <ResponseBody body={response.body} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/40 p-4 text-sm text-foreground/60">Send a request to preview the response.</div>
        )}
      </div>
    </div>
  )
}

interface CodeBlockProps {
  title: string
  subtitle: string
  lines: Array<string>
  disabled?: boolean
}

function CodeBlock({ title, subtitle, lines, disabled }: CodeBlockProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/60">
          <p>{subtitle}</p>
          <p className="text-[11px] text-foreground/40">{title}</p>
        </div>
        <button
          type="button"
          disabled={disabled || !lines.length}
          onClick={() => navigator.clipboard.writeText(lines.join('\n'))}
          className="rounded-full border border-border/40 px-3 py-1 text-xs text-foreground/70 transition hover:text-foreground disabled:opacity-50"
        >
          <Copy className="mr-2 inline h-3 w-3" />
          Copy
        </button>
      </div>
      <pre className="scrollbar-hide max-h-[320px] overflow-auto rounded-xl border border-border/30 bg-background/70 p-4 text-xs leading-relaxed text-foreground/80">
        {lines.length ? lines.join('\n') : 'Configure a server URL to preview the generated curl command.'}
      </pre>
    </div>
  )
}

