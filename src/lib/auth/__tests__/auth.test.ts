import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Control storage durability; keep the real (in-memory, under test) store for ops.
vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>()
  return { ...actual, isRemoteStorage: vi.fn(() => true) }
})

import { getStorage, isRemoteStorage, __resetStorageForTests } from '@/lib/storage'
import { claimOwnerIfEligible } from '@/lib/auth/owner-claim'
import { upsertMember, getMember, removeMember } from '@/lib/auth/team'
import { resolveAdminSession, requireCapability } from '@/lib/auth/rbac'
import { signSession } from '@/lib/auth/session'

const eligible = { email: 'alice@acme.com', isVerified: true, isAllowed: true }

beforeEach(() => {
  __resetStorageForTests()
  vi.mocked(isRemoteStorage).mockReturnValue(true)
})

afterEach(() => {
  delete process.env.DOX_AUTH_SECRET
})

describe('claimOwnerIfEligible — the four guards', () => {
  it('claims Owner on a clean, durable, verified, allowlisted first login', async () => {
    expect((await claimOwnerIfEligible(eligible)).claimed).toBe(true)
    expect((await getMember('alice@acme.com'))?.role).toBe('owner')
  })

  it('refuses on ephemeral storage — the serverless cold-start re-claim vuln', async () => {
    vi.mocked(isRemoteStorage).mockReturnValue(false)
    expect(await claimOwnerIfEligible(eligible)).toEqual({ claimed: false, reason: 'ephemeral_storage' })
  })

  it('refuses a non-allowlisted email — no open internet land-grab', async () => {
    expect(await claimOwnerIfEligible({ ...eligible, isAllowed: false })).toEqual({
      claimed: false,
      reason: 'not_allowed',
    })
  })

  it('refuses an unverified identity', async () => {
    expect(await claimOwnerIfEligible({ ...eligible, isVerified: false })).toEqual({
      claimed: false,
      reason: 'unverified',
    })
  })

  it('refuses once a team already exists', async () => {
    await claimOwnerIfEligible(eligible)
    expect((await claimOwnerIfEligible({ ...eligible, email: 'mallory@acme.com' })).claimed).toBe(false)
  })

  it('lets exactly one of two concurrent first-logins win the race', async () => {
    const [a, b] = await Promise.all([
      claimOwnerIfEligible({ ...eligible, email: 'a@acme.com' }),
      claimOwnerIfEligible({ ...eligible, email: 'b@acme.com' }),
    ])
    expect([a.claimed, b.claimed].filter(Boolean)).toHaveLength(1)
  })
})

describe('rbac — live role, instant revocation', () => {
  it('resolves the live role, gates by capability, and denies a removed member immediately', async () => {
    process.env.DOX_AUTH_SECRET = 'test-secret-at-least-16-chars'
    await upsertMember({ email: 'bob@acme.com', role: 'editor', status: 'active', addedAt: Date.now() })
    const token = (await signSession({ email: 'bob@acme.com' }))!

    expect((await resolveAdminSession(token))?.role).toBe('editor')
    expect(await requireCapability(token, 'manage_docs')).not.toBeNull()
    expect(await requireCapability(token, 'manage_team')).toBeNull() // editor ≠ owner

    // Same still-valid cookie, but the member is gone → denied on the next request.
    await removeMember('bob@acme.com')
    expect(await resolveAdminSession(token)).toBeNull()
  })
})
