import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  aggregateAnalytics,
  trackAnalyticsEvent,
  __resetAnalyticsStoreForTests,
} from '@/lib/analytics/store'

describe('analytics store', () => {
  beforeEach(() => {
    // Isolate each test in its own in-memory libSQL database.
    process.env.DOX_ANALYTICS_DB_URL = ':memory:'
    __resetAnalyticsStoreForTests()
  })

  afterEach(() => {
    __resetAnalyticsStoreForTests()
    delete process.env.DOX_ANALYTICS_DB_URL
  })

  it('aggregates human and agent page views', async () => {
    const now = Date.now()
    await trackAnalyticsEvent({ type: 'page_view', path: '/guides/foo', visitorType: 'human', ts: now })
    await trackAnalyticsEvent({ type: 'page_view', path: '/guides/foo', visitorType: 'agent', agentSignal: 'user_agent', ts: now })
    await trackAnalyticsEvent({ type: 'feedback', path: '/guides/foo', page: '/guides/foo', vote: 'yes', visitorType: 'human', ts: now })

    const summary = await aggregateAnalytics('7d')
    expect(summary.totals.pageViews).toBe(2)
    expect(summary.totals.humanViews).toBe(1)
    expect(summary.totals.agentViews).toBe(1)
    expect(summary.totals.feedbackYes).toBe(1)
    expect(summary.agentSignals[0]?.signal).toBe('user_agent')
  })

  it('excludes events outside the requested range', async () => {
    const now = Date.now()
    const old = now - 40 * 24 * 60 * 60 * 1000
    await trackAnalyticsEvent({ type: 'page_view', path: '/recent', visitorType: 'human', ts: now })
    await trackAnalyticsEvent({ type: 'page_view', path: '/stale', visitorType: 'human', ts: old })

    const summary = await aggregateAnalytics('7d')
    expect(summary.totals.pageViews).toBe(1)
    expect(summary.topPages.human[0]?.path).toBe('/recent')
  })

  it('persists events across a client reset (durable store)', async () => {
    // :memory: is per-connection, so use a temp file to prove durability.
    const file = `file:${process.cwd()}/.data/analytics/__test_durable_${Date.now()}.db`
    process.env.DOX_ANALYTICS_DB_URL = file
    __resetAnalyticsStoreForTests()

    const now = Date.now()
    await trackAnalyticsEvent({ type: 'page_view', path: '/durable', visitorType: 'agent', ts: now })

    // Simulate a new serverless instance picking up the same store.
    __resetAnalyticsStoreForTests()
    const summary = await aggregateAnalytics('7d')
    expect(summary.totals.agentViews).toBe(1)

    // Clean up the temp database files.
    const fs = await import('node:fs')
    for (const suffix of ['', '-shm', '-wal']) {
      const p = file.replace('file:', '') + suffix
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
  })
})
