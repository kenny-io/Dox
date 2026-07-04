'use client'

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { AnalyticsRange, AnalyticsSummary } from '@/lib/analytics/types'

const RANGES: Array<{ id: AnalyticsRange; label: string }> = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
]

function seriesBar(series: 1 | 2): CSSProperties {
  return {
    background: `linear-gradient(180deg, var(--ds-series-${series}) 0%, color-mix(in oklch, var(--ds-series-${series}) 55%, transparent) 100%)`,
  }
}

function StatCard({
  label,
  value,
  hint,
  modifier,
  delay,
}: {
  label: string
  value: string | number
  hint?: ReactNode
  modifier?: string
  delay: number
}) {
  return (
    <div className={cn('ds-stat-card ds-rise', modifier)} style={{ animationDelay: `${delay}ms` }}>
      <span className="ds-stat-card-label">{label}</span>
      <span className="ds-stat-card-value">{value}</span>
      {hint ? <div className="ds-stat-card-footer">{hint}</div> : null}
    </div>
  )
}

function TrafficChart({ data }: { data: AnalyticsSummary['dailyTraffic'] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="ds-panel">
      <div className="ds-panel-head">
        <div>
          <div className="ds-panel-title">Traffic over time</div>
          <div className="ds-panel-sub">Human vs agent</div>
        </div>
        <div className="flex items-center gap-4" style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--ds-series-1)' }} /> Human
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--ds-series-2)' }} /> Agent
          </span>
        </div>
      </div>
      <div className="flex h-52 items-end gap-[3px]">
        {data.length === 0 ? (
          <p className="m-auto" style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
            No traffic recorded yet for this range.
          </p>
        ) : (
          data.map((point) => (
            <div key={point.date} className="group flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: '12rem' }}>
                <div
                  className="w-full rounded-t-[3px]"
                  style={{ ...seriesBar(2), height: `${(point.agent / max) * 100}%`, minHeight: point.agent ? 2 : 0 }}
                  title={`Agent: ${point.agent}`}
                />
                <div
                  className="w-full rounded-t-[3px]"
                  style={{ ...seriesBar(1), height: `${(point.human / max) * 100}%`, minHeight: point.human ? 2 : 0 }}
                  title={`Human: ${point.human}`}
                />
              </div>
              <span className="hidden group-hover:block" style={{ fontSize: 'var(--ds-text-micro)', color: 'var(--ds-text-faint)' }}>
                {point.date.slice(5)}
              </span>
            </div>
          ))
        )}
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
    <div className="ds-panel">
      <div className="ds-panel-head">
        <div className="ds-panel-title">{title}</div>
      </div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>{emptyLabel}</p>
      ) : (
        <table className="ds-table">
          <thead>
            <tr>
              <th>Page</th>
              <th className="ds-num">Views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.path}>
                <td className="max-w-0">
                  <span className="block truncate" title={row.path} style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 'var(--ds-text-sm)' }}>
                    {row.path}
                  </span>
                </td>
                <td className="ds-num">
                  <strong style={{ fontWeight: 'var(--ds-fw-semibold)' }}>{row.views.toLocaleString()}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ListPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ds-panel">
      <div className="ds-panel-head">
        <div className="ds-panel-title">{title}</div>
      </div>
      {children}
    </div>
  )
}

export function AnalyticsView() {
  const router = useRouter()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (selectedRange: AnalyticsRange) => {
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
    },
    [router],
  )

  useEffect(() => {
    void load(range)
  }, [range, load])

  const agentShare =
    data && data.totals.pageViews > 0 ? Math.round((data.totals.agentViews / data.totals.pageViews) * 100) : 0

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="ds-eyebrow">Traffic &amp; engagement</div>
          <h2 className="ds-section-title" style={{ marginBottom: 0 }}>
            Audience
          </h2>
        </div>
        <div className="ds-segmented" role="tablist" aria-label="Date range">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className="ds-segmented__item ds-focusable"
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>Loading analytics…</p>
      ) : error ? (
        <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-danger)' }}>{error}</p>
      ) : data ? (
        <div className="space-y-6">
          <div className="dash-grid dash-grid--4">
            <StatCard label="Total page views" value={data.totals.pageViews.toLocaleString()} delay={40} />
            <StatCard
              label="Human traffic"
              value={data.totals.humanViews.toLocaleString()}
              hint={`${100 - agentShare}% of views`}
              delay={90}
            />
            <StatCard
              label="Agent traffic"
              value={data.totals.agentViews.toLocaleString()}
              modifier="ds-stat-card--glow ds-stat-card--accent2"
              hint={
                <>
                  <span className="ds-chip ds-chip--accent">{agentShare}%</span> of views
                </>
              }
              delay={140}
            />
            <StatCard
              label="Discovery hits"
              value={data.totals.discoveryHits.toLocaleString()}
              hint="llms.txt, ai.txt, docs-index"
              delay={190}
            />
          </div>

          <div className="dash-grid dash-grid--2">
            <TrafficChart data={data.dailyTraffic} />
            <div className="ds-panel flex flex-col">
              <div className="ds-panel-head">
                <div>
                  <div className="ds-panel-title">Engagement</div>
                  <div className="ds-panel-sub">Feedback &amp; chat</div>
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <span
                  style={{
                    fontFamily: 'var(--ds-font-heading)',
                    fontSize: 'var(--ds-text-h1)',
                    fontWeight: 'var(--ds-fw-extrabold)',
                    letterSpacing: 'var(--ds-tracking-tighter)',
                    lineHeight: 1,
                  }}
                >
                  {(data.totals.feedbackYes + data.totals.feedbackNo).toLocaleString()}
                </span>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="ds-chip ds-chip--success">{data.totals.feedbackYes} helpful</span>
                  <span className="ds-chip ds-chip--warn">{data.totals.feedbackNo} not helpful</span>
                  <span className="ds-chip ds-chip--neutral">{data.totals.chatMessages} chat</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <TopPagesTable title="Top pages — humans" rows={data.topPages.human} emptyLabel="No human traffic yet." />
            <TopPagesTable title="Top pages — agents" rows={data.topPages.agent} emptyLabel="No agent traffic yet." />
          </div>

          <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <ListPanel title="Agent detection signals">
              {data.agentSignals.length === 0 ? (
                <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>No agent requests recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.agentSignals.map((row) => (
                    <div key={row.signal} className="flex items-center justify-between">
                      <span className="ds-chip ds-chip--neutral" style={{ fontFamily: 'var(--ds-font-mono)' }}>
                        {row.signal}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-secondary)' }}>
                        {row.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ListPanel>

            <ListPanel title="Recent feedback">
              {data.recentFeedback.length === 0 ? (
                <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>No feedback submitted yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.recentFeedback.map((item) => (
                    <div key={`${item.ts}-${item.page}`} className="flex items-center justify-between gap-3">
                      <span
                        className="min-w-0 truncate"
                        title={item.page}
                        style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-secondary)' }}
                      >
                        {item.page}
                      </span>
                      <span className={cn('ds-chip', item.vote === 'yes' ? 'ds-chip--success' : 'ds-chip--warn')}>
                        {item.vote === 'yes' ? 'Helpful' : 'Not helpful'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ListPanel>
          </div>

          <div>
            <div className="mb-4">
              <div className="ds-eyebrow">Search</div>
              <h2 className="ds-section-title" style={{ marginBottom: 0 }}>What people look for</h2>
            </div>
            {data.search.totalSearches === 0 ? (
              <div className="ds-panel">
                <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>No searches recorded yet for this range.</p>
              </div>
            ) : (
              <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <div className="ds-panel">
                  <div className="ds-panel-head">
                    <div className="ds-panel-title">Top search terms</div>
                    <span className="ds-chip ds-chip--neutral">
                      {data.search.totalSearches.toLocaleString()} searches · {Math.round(data.search.clickThroughRate * 100)}% CTR
                    </span>
                  </div>
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th className="ds-num">Searches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.search.topTerms.map((t) => (
                        <tr key={t.term}>
                          <td className="max-w-0">
                            <span className="block truncate" title={t.term}>{t.term}</span>
                          </td>
                          <td className="ds-num">
                            <strong style={{ fontWeight: 'var(--ds-fw-semibold)' }}>{t.count.toLocaleString()}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ListPanel title="Content gaps — zero results">
                  {data.search.zeroResults.length === 0 ? (
                    <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
                      Every search found something. 🎉
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.search.zeroResults.map((t) => (
                        <span key={t.term} className="ds-chip ds-chip--warn" title={`${t.count} searches, no results`}>
                          {t.term}
                          {t.count > 1 ? ` · ${t.count}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </ListPanel>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
