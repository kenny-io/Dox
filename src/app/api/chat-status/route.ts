import { NextResponse } from 'next/server'
import { getAdminSettings } from '@/lib/admin/settings'
import { getAiConfig } from '@/data/docs'

export const runtime = 'nodejs'

/**
 * Public: whether the AI chat widget should show. Lets the admin toggle chat
 * live (F1 override) without making every static docs page dynamic — the client
 * DocsChat fetches this and hides itself when disabled.
 */
export async function GET() {
  const settings = await getAdminSettings()
  const buildDefault = Boolean(getAiConfig().chat)
  const show = settings.chatEnabled ?? buildDefault
  return NextResponse.json({ show }, { headers: { 'Cache-Control': 'no-store' } })
}
