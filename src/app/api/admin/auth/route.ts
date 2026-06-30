import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminAuthenticated,
  isAdminEnabled,
  verifyAdminPassword,
} from '@/lib/admin/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: 'Admin dashboard is not configured. Set DOX_ADMIN_PASSWORD.' },
      { status: 503 },
    )
  }

  const body = (await request.json()) as { password?: string }
  if (!body.password || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = createAdminSessionToken()
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return response
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminAuthenticated(request), enabled: isAdminEnabled() })
}
