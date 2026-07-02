'use client'

import { useEffect, useState } from 'react'
import type { AgentReadinessReport, SubscoreResult } from '@/lib/agent-readiness/types'

type ReadinessResponse = AgentReadinessReport & {
  schema_version: string
  as_of: string
}

const GRADE_COLORS: Record<AgentReadinessReport['grade'], string> = {
  A: 'text-emerald-600',
  B: 'text-emerald-600',
  C: 'text-amber-600',
  D: 'text-amber-600',
  F: 'text-red-600',
}

function barColor(score: number): string {
  if (score >= 0.9) return 'bg-emerald-500'
  if (score >= 0.7) return 'bg-amber-500'
  return 'bg-red-500'
}

function ScoreRing({ score, grade }: { score: number; grade: AgentReadinessReport['grade'] }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const stroke = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-border" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score}</span>
        <span className={`text-sm font-semibold ${GRADE_COLORS[grade]}`}>Grade {grade}</span>
      </div>
    </div>
  )
}

function SubscoreRow({ sub }: { sub: SubscoreResult }) {
  const [open, setOpen] = useState(false)
  const pct = Math.round(sub.score * 100)
  const hasOffenders = sub.offenders.length > 0

  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{sub.label}</p>
          <p className="truncate text-xs text-muted-foreground">{sub.detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">{Math.round(sub.weight * 100)}% weight</span>
          <span className="w-10 text-right text-sm font-semibold tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${barColor(sub.score)}`} style={{ width: `${pct}%` }} />
        </div>
        {hasOffenders ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {open ? 'Hide' : `Fix ${sub.offenders.length}`}
          </button>
        ) : null}
      </div>
      {open && hasOffenders ? (
        <ul className="mt-3 space-y-1.5 rounded-lg bg-muted/50 p-3">
          {sub.offenders.map((offender) => (
            <li key={offender.pageId} className="flex items-center justify-between gap-3 text-xs">
              <a href={offender.href} target="_blank" rel="noreferrer" className="truncate font-mono text-foreground/80 hover:underline">
                {offender.href}
              </a>
              <span className="shrink-0 text-muted-foreground">{offender.reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function AgentReadinessPanel() {
  const [report, setReport] = useState<ReadinessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/agent-readiness')
        if (!res.ok) throw new Error('failed')
        const data = (await res.json()) as ReadinessResponse
        if (active) setReport(data)
      } catch {
        if (active) setError('Unable to load the Agent Readiness Score.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="rounded-xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Agent Readiness Score</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How well your docs serve AI agents — structured data, metadata, discovery, and machine-readability.
          </p>
        </div>
        <a
          href="/api/agent-readiness"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          View JSON
        </a>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Computing score…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      ) : report ? (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:justify-center">
            <ScoreRing score={report.score} grade={report.grade} />
            <p className="text-xs text-muted-foreground lg:text-center">
              across {report.totalPages} page{report.totalPages === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex-1">
            {report.subscores.map((sub) => (
              <SubscoreRow key={sub.id} sub={sub} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
