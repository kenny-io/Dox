'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import type { AgentReadinessReport } from '@/lib/agent-readiness/types'
import type { AnalyticsSummary } from '@/lib/analytics/types'

function ringTone(score: number): 'success' | 'warn' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warn'
  return 'danger'
}

const AGENT_ENDPOINTS = ['/llms.txt', '/ai.txt', '/api/docs-index', '/api/agent-readiness']

export function HomeView({ siteName }: { siteName: string }) {
  const [readiness, setReadiness] = useState<AgentReadinessReport | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const [r, a] = await Promise.allSettled([
        fetch('/api/agent-readiness').then((res) => (res.ok ? res.json() : null)),
        fetch('/api/admin/analytics?range=30d').then((res) => (res.ok ? res.json() : null)),
      ])
      if (!active) return
      if (r.status === 'fulfilled') setReadiness(r.value)
      if (a.status === 'fulfilled') setAnalytics(a.value)
    })()
    return () => {
      active = false
    }
  }, [])

  const tone = readiness ? ringTone(readiness.score) : 'success'
  const agentShare =
    analytics && analytics.totals.pageViews > 0
      ? Math.round((analytics.totals.agentViews / analytics.totals.pageViews) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="dash-grid dash-grid--2">
        {/* Site status hero */}
        <div className="ds-panel ds-rise" style={{ animationDelay: '40ms' }}>
          <div className="ds-panel-head">
            <div>
              <div className="ds-eyebrow">Your docs</div>
              <div className="flex items-center gap-2.5">
                <span className="ds-panel-title" style={{ fontSize: 'var(--ds-text-h3)', margin: 0 }}>
                  {siteName}
                </span>
                <span className="ds-chip ds-chip--success">● Agent-ready</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)', marginBottom: 'var(--ds-space-16)' }}>
            Every page is served to humans as HTML and to AI agents as JSON, JSON-LD, and Markdown from the same URL.
          </p>
          <div className="flex flex-wrap gap-2">
            {AGENT_ENDPOINTS.map((href) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="ds-chip ds-chip--neutral ds-focusable"
                style={{ fontFamily: 'var(--ds-font-mono)' }}
              >
                {href}
              </a>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="ds-focusable inline-flex items-center gap-2"
              style={{
                fontSize: 'var(--ds-text-sm)',
                fontWeight: 'var(--ds-fw-semibold)',
                color: 'var(--ds-accent-fg)',
                background: 'var(--ds-accent)',
                borderRadius: 'var(--ds-radius-md)',
                padding: 'var(--ds-space-8) var(--ds-space-16)',
              }}
            >
              View site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Link
              href="/admin/analytics"
              className="ds-focusable inline-flex items-center gap-2"
              style={{
                fontSize: 'var(--ds-text-sm)',
                fontWeight: 'var(--ds-fw-medium)',
                color: 'var(--ds-text-secondary)',
                background: 'var(--ds-surface-card)',
                border: '1px solid var(--ds-border)',
                borderRadius: 'var(--ds-radius-md)',
                padding: 'var(--ds-space-8) var(--ds-space-16)',
              }}
            >
              View analytics
            </Link>
          </div>
        </div>

        {/* Agent Readiness summary */}
        <Link
          href="/admin/agent-readiness"
          className={`ds-panel ds-rise ds-focusable group block ds-ring--${tone}`}
          style={{ animationDelay: '90ms' }}
        >
          <div className="ds-panel-head">
            <div>
              <div className="ds-eyebrow">Agent readiness</div>
              <div className="ds-panel-title" style={{ margin: 0 }}>
                How agent-ready are your docs?
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" style={{ color: 'var(--ds-text-muted)' }} />
          </div>
          {readiness ? (
            <div className="flex items-center gap-5">
              <div
                className={`ds-ring ds-ring--${tone}`}
                style={{ '--ds-ring-value': readiness.score, '--ds-ring-size': '104px', '--ds-ring-stroke': '8' } as CSSProperties}
              >
                <svg className="ds-ring__svg" viewBox="0 0 100 100">
                  <circle className="ds-ring__track" cx="50" cy="50" r="45" pathLength={100} />
                  <circle className="ds-ring__fill" cx="50" cy="50" r="45" pathLength={100} />
                </svg>
                <span className="ds-ring__label" style={{ fontSize: 'var(--ds-text-h4)', fontWeight: 'var(--ds-fw-extrabold)' }}>
                  {readiness.score}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 'var(--ds-text-h4)', fontWeight: 'var(--ds-fw-bold)', color: `var(--ds-${tone})` }}>
                  Grade {readiness.grade}
                </div>
                <div style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
                  across {readiness.totalPages} page{readiness.totalPages === 1 ? '' : 's'}
                </div>
                <div className="mt-2" style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-accent-mid)', fontWeight: 'var(--ds-fw-semibold)' }}>
                  View breakdown →
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>Computing score…</p>
          )}
        </Link>
      </div>

      {/* KPI glance (last 30 days) */}
      <div className="dash-grid dash-grid--4">
        {[
          { label: 'Page views', value: analytics?.totals.pageViews, delay: 140 },
          { label: 'Human', value: analytics?.totals.humanViews, hint: `${100 - agentShare}% of views`, delay: 180 },
          { label: 'Agent', value: analytics?.totals.agentViews, hint: `${agentShare}% of views`, delay: 220, mod: 'ds-stat-card--accent2' },
          { label: 'Discovery hits', value: analytics?.totals.discoveryHits, delay: 260 },
        ].map((k) => (
          <div key={k.label} className={`ds-stat-card ds-rise ${k.mod ?? ''}`} style={{ animationDelay: `${k.delay}ms` }}>
            <span className="ds-stat-card-label">{k.label}</span>
            <span className="ds-stat-card-value">{k.value != null ? k.value.toLocaleString() : '—'}</span>
            {k.hint ? <div className="ds-stat-card-footer">{k.hint}</div> : null}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-faint)' }}>Metrics reflect the last 30 days.</p>
    </div>
  )
}
