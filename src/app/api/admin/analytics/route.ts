import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { aggregateAnalytics } from '@/lib/analytics/store'
import { isAdminAuthenticated, isAdminEnabled } from '@/lib/admin/auth'
import { isAdminDashboardEnabled } from '@/data/docs'
import type { AnalyticsRange } from '@/lib/analytics/types'

export const runtime = 'nodejs'

function parseRange(value: string | null): AnalyticsRange {
  if (value === '7d' || value === '30d' || value === '90d') return value
  return '30d'
}

export async function GET(request: NextRequest) {
  if (!isAdminEnabled() || !isAdminDashboardEnabled()) {
    return NextResponse.json({ error: 'Admin dashboard is not configured.' }, { status: 503 })
  }

  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const range = parseRange(request.nextUrl.searchParams.get('range'))
  const summary = await aggregateAnalytics(range)
  return NextResponse.json(summary)
}
