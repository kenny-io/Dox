import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { aggregateAnalytics, trackAnalyticsEvent } from '@/lib/analytics/store'

const EVENTS_FILE = path.join(process.cwd(), '.data', 'analytics', 'events.jsonl')

describe('analytics store', () => {
  beforeEach(() => {
    fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true })
    fs.writeFileSync(EVENTS_FILE, '')
  })

  afterEach(() => {
    if (fs.existsSync(EVENTS_FILE)) fs.unlinkSync(EVENTS_FILE)
  })

  it('aggregates human and agent page views', () => {
    const now = Date.now()
    trackAnalyticsEvent({ type: 'page_view', path: '/guides/foo', visitorType: 'human', ts: now })
    trackAnalyticsEvent({ type: 'page_view', path: '/guides/foo', visitorType: 'agent', agentSignal: 'user_agent', ts: now })
    trackAnalyticsEvent({ type: 'feedback', path: '/guides/foo', page: '/guides/foo', vote: 'yes', visitorType: 'human', ts: now })

    const summary = aggregateAnalytics('7d')
    expect(summary.totals.pageViews).toBe(2)
    expect(summary.totals.humanViews).toBe(1)
    expect(summary.totals.agentViews).toBe(1)
    expect(summary.totals.feedbackYes).toBe(1)
    expect(summary.agentSignals[0]?.signal).toBe('user_agent')
  })
})
