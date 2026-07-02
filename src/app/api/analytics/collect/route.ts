import { type NextRequest, NextResponse } from 'next/server'
import { trackAnalyticsEvent } from '@/lib/analytics/store'
import { getInternalAnalyticsSecret } from '@/lib/admin/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-dox-analytics-secret')
  if (secret !== getInternalAnalyticsSecret()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    await trackAnalyticsEvent(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
}
