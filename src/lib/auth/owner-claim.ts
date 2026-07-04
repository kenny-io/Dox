import { getStorage, isRemoteStorage } from '@/lib/storage'
import { memberCount, upsertMember } from '@/lib/auth/team'
import type { Member } from '@/lib/auth/types'

export interface ClaimInput {
  email: string
  /** The OIDC id-token was cryptographically verified. */
  isVerified: boolean
  /** The email is within the configured allowlist (domain or explicit). */
  isAllowed: boolean
}

export type ClaimReason = 'unverified' | 'not_allowed' | 'ephemeral_storage' | 'team_exists' | 'lost_race'

export interface ClaimResult {
  claimed: boolean
  reason?: ClaimReason
}

/**
 * First-login-claims-Owner — but only when it's actually safe. ALL of:
 *  1. the identity is cryptographically verified,
 *  2. the email is allowlisted,
 *  3. the store is DURABLE (remote) — on ephemeral serverless storage the claim
 *     would evaporate on cold start and the next visitor would re-claim Owner,
 *  4. an ATOMIC increment makes exactly one of two racing first-logins win.
 *
 * Miss any guard → no auto-owner; the deployment falls back to the break-glass
 * DOX_ADMIN_PASSWORD until a durable store + allowlist are configured.
 */
export async function claimOwnerIfEligible(input: ClaimInput): Promise<ClaimResult> {
  if (!input.isVerified) return { claimed: false, reason: 'unverified' }
  if (!input.isAllowed) return { claimed: false, reason: 'not_allowed' }
  if (!isRemoteStorage()) return { claimed: false, reason: 'ephemeral_storage' }

  // Fast path: a team already exists — never auto-claim.
  if ((await memberCount()) > 0) return { claimed: false, reason: 'team_exists' }

  // Atomic arbiter: only the first caller's increment returns 1. Two concurrent
  // first-logins that both passed the count check can't both win here.
  const seq = await getStorage().kvIncrement('auth', 'owner_claim')
  if (seq.count !== 1) return { claimed: false, reason: 'lost_race' }

  const owner: Member = {
    email: input.email.trim().toLowerCase(),
    role: 'owner',
    status: 'active',
    addedAt: Date.now(),
  }
  await upsertMember(owner)
  return { claimed: true }
}
