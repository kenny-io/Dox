import { NextResponse } from 'next/server'
import { trackAnalyticsEvent } from '@/lib/analytics/store'

/**
 * POST /api/feedback
 *
 * Receives page feedback votes from the Feedback component.
 * Body: { page: string, vote: "yes" | "no", url: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { page, vote, url } = body as { page?: string; vote?: string; url?: string }

    if (!page || !vote) {
      return NextResponse.json({ error: 'Missing page or vote' }, { status: 400 })
    }

    if (vote === 'yes' || vote === 'no') {
      trackAnalyticsEvent({
        type: 'feedback',
        path: url ?? page,
        page,
        vote,
        visitorType: 'human',
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
