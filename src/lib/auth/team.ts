import { getStorage } from '@/lib/storage'
import type { Member } from '@/lib/auth/types'

const NS = 'team'

function key(email: string): string {
  return email.trim().toLowerCase()
}

export async function getMember(email: string): Promise<Member | null> {
  return getStorage().kvGet<Member>(NS, key(email))
}

export async function listMembers(): Promise<Array<Member>> {
  const entries = await getStorage().kvList<Member>(NS)
  return entries.map((e) => e.value).sort((a, b) => a.addedAt - b.addedAt)
}

export async function upsertMember(member: Member): Promise<void> {
  const normalized: Member = { ...member, email: key(member.email) }
  await getStorage().kvSet(NS, normalized.email, normalized)
}

export async function removeMember(email: string): Promise<void> {
  await getStorage().kvDelete(NS, key(email))
}

export async function memberCount(): Promise<number> {
  return (await listMembers()).length
}
