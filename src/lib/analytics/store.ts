import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AnalyticsEvent, AnalyticsRange, AnalyticsSummary, DailyTrafficPoint } from '@/lib/analytics/types'

const DATA_DIR = path.join(process.cwd(), '.data', 'analytics')
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl')

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function trackAnalyticsEvent(
  partial: Omit<AnalyticsEvent, 'id' | 'ts'> & { ts?: number },
): AnalyticsEvent {
  ensureDataDir()
  const event: AnalyticsEvent = {
    id: randomUUID(),
    ts: partial.ts ?? Date.now(),
    type: partial.type,
    path: partial.path,
    slug: partial.slug,
    visitorType: partial.visitorType,
    agentSignal: partial.agentSignal,
    format: partial.format,
    referer: partial.referer,
    vote: partial.vote,
    page: partial.page,
  }

  fs.appendFileSync(EVENTS_FILE, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

function readEventsSince(sinceMs: number): Array<AnalyticsEvent> {
  if (!fs.existsSync(EVENTS_FILE)) return []

  const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
  const events: Array<AnalyticsEvent> = []

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line) as AnalyticsEvent
      if (event.ts >= sinceMs) events.push(event)
    } catch {
      // skip malformed lines
    }
  }

  return events
}

function dateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export function aggregateAnalytics(range: AnalyticsRange): AnalyticsSummary {
  const days = RANGE_DAYS[range]
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000
  const events = readEventsSince(sinceMs)

  const dailyMap = new Map<string, DailyTrafficPoint>()
  const humanPages = new Map<string, number>()
  const agentPages = new Map<string, number>()
  const signalCounts = new Map<string, number>()

  let humanViews = 0
  let agentViews = 0
  let feedbackYes = 0
  let feedbackNo = 0
  let chatMessages = 0
  let discoveryHits = 0

  const recentFeedback: AnalyticsSummary['recentFeedback'] = []

  for (const event of events) {
    if (event.type === 'page_view' || event.type === 'api_fetch') {
      if (event.visitorType === 'agent') {
        agentViews++
        agentPages.set(event.path, (agentPages.get(event.path) ?? 0) + 1)
        if (event.agentSignal) {
          signalCounts.set(event.agentSignal, (signalCounts.get(event.agentSignal) ?? 0) + 1)
        }
      } else {
        humanViews++
        humanPages.set(event.path, (humanPages.get(event.path) ?? 0) + 1)
      }

      const key = dateKey(event.ts)
      const point = dailyMap.get(key) ?? { date: key, human: 0, agent: 0, total: 0 }
      if (event.visitorType === 'agent') point.agent++
      else point.human++
      point.total++
      dailyMap.set(key, point)
    }

    if (event.type === 'discovery') {
      discoveryHits++
    }

    if (event.type === 'feedback') {
      if (event.vote === 'yes') feedbackYes++
      if (event.vote === 'no') feedbackNo++
      if (event.page) {
        recentFeedback.push({ ts: event.ts, page: event.page, vote: event.vote ?? 'no' })
      }
    }

    if (event.type === 'chat_message') {
      chatMessages++
    }
  }

  recentFeedback.sort((a, b) => b.ts - a.ts)

  const dailyTraffic = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  function topPages(map: Map<string, number>) {
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }))
  }

  return {
    range,
    totals: {
      pageViews: humanViews + agentViews,
      humanViews,
      agentViews,
      feedbackYes,
      feedbackNo,
      chatMessages,
      discoveryHits,
    },
    dailyTraffic,
    topPages: {
      human: topPages(humanPages),
      agent: topPages(agentPages),
    },
    agentSignals: Array.from(signalCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([signal, count]) => ({ signal, count })),
    recentFeedback: recentFeedback.slice(0, 20),
  }
}
