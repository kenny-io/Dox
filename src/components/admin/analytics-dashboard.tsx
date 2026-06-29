'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { AnalyticsRange, AnalyticsSummary } from '@/lib/analytics/types'

const RANGES: Array<{ id: AnalyticsRange; label: string }> = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
]

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function TrafficChart({ data }: { data: AnalyticsSummary['dailyTraffic'] }) {
  const max = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <h3 className="text-sm font-semibold">Traffic over time</h3>
      <div className="mt-6 flex h-48 items-end gap-1">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traffic recorded yet for this range.</p>
        ) : (
          data.map((point) => (
            <div key={point.date} className="group flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: '10rem' }}>
                <div
                  className="w-full rounded-t bg-emerald-500/80"
                  style={{ height: `${(point.human / max) * 100}%`, minHeight: point.human ? 2 : 0 }}
                  title={`Human: ${point.human}`}
                />
                <div
                  className="w-full rounded-t bg-violet-500/80"
                  style={{ height: `${(point.agent / max) * 100}%`, minHeight: point.agent ? 2 : 0 }}
                  title={`Agent: ${point.agent}`}
                />
              </div>
              <span className="hidden text-[10px] text-muted-foreground group-hover:block">
                {point.date.slice(5)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Human
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" /> Agent
        </span>
      </div>
    </div>
  )
}

function TopPagesTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: Array<{ path: string; views: number }>
  emptyLabel: string
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          rows.map((row) => (
            <div key={row.path} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-mono text-xs text-foreground/80">{row.path}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.views}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function AnalyticsDashboard() {
  const router = useRouter()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (selectedRange: AnalyticsRange) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytics?range=${selectedRange}`)
      if (res.status === 401) {
        router.replace('/admin/login')
        return
      }
      if (!res.ok) throw new Error('Failed to load analytics')
      setData(await res.json())
    } catch {
      setError('Unable to load analytics data.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load(range)
  }, [range, load])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }

  const agentShare =
    data && data.totals.pageViews > 0
      ? Math.round((data.totals.agentViews / data.totals.pageViews) * 100)
      : 0

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Dox Admin</p>
            <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
              View docs
            </a>
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                range === item.id
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total page views" value={data.totals.pageViews.toLocaleString()} />
              <MetricCard
                label="Human traffic"
                value={data.totals.humanViews.toLocaleString()}
                hint={`${100 - agentShare}% of views`}
              />
              <MetricCard
                label="Agent traffic"
                value={data.totals.agentViews.toLocaleString()}
                hint={`${agentShare}% of views`}
              />
              <MetricCard label="Discovery hits" value={data.totals.discoveryHits.toLocaleString()} hint="llms.txt, ai.txt, docs-index" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TrafficChart data={data.dailyTraffic} />
              </div>
              <MetricCard
                label="Engagement"
                value={`${data.totals.feedbackYes + data.totals.feedbackNo}`}
                hint={`${data.totals.feedbackYes} helpful · ${data.totals.feedbackNo} not helpful · ${data.totals.chatMessages} chat messages`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <TopPagesTable title="Top pages — humans" rows={data.topPages.human} emptyLabel="No human traffic yet." />
              <TopPagesTable title="Top pages — agents" rows={data.topPages.agent} emptyLabel="No agent traffic yet." />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <h3 className="text-sm font-semibold">Agent detection signals</h3>
                <div className="mt-4 space-y-2">
                  {data.agentSignals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No agent requests recorded.</p>
                  ) : (
                    data.agentSignals.map((row) => (
                      <div key={row.signal} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">{row.signal}</span>
                        <span className="tabular-nums text-muted-foreground">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <h3 className="text-sm font-semibold">Recent feedback</h3>
                <div className="mt-4 space-y-2">
                  {data.recentFeedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
                  ) : (
                    data.recentFeedback.map((item) => (
                      <div key={`${item.ts}-${item.page}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-mono text-xs">{item.page}</span>
                        <span className={item.vote === 'yes' ? 'text-emerald-600' : 'text-amber-600'}>
                          {item.vote === 'yes' ? 'Helpful' : 'Not helpful'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
