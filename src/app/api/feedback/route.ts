import { NextResponse } from 'next/server'

/**
 * POST /api/feedback
 *
 * Receives page feedback votes from the Feedback component.
 * Body: { page: string, vote: "yes" | "no", url: string }
 *
 * Replace this handler with your own storage logic — write to a database,
 * forward to a webhook, send to PostHog, etc.
 *
 * To use an external endpoint instead, set `feedback.endpoint` in docs.json
 * to any URL and remove this route — the Feedback component will POST there directly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { page, vote, url } = body as { page?: string; vote?: string; url?: string }

    if (!page || !vote) {
      return NextResponse.json({ error: 'Missing page or vote' }, { status: 400 })
    }

    // Default implementation: log to stdout (replace with your storage logic)
    console.log('[feedback]', { page, vote, url, at: new Date().toISOString() })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
