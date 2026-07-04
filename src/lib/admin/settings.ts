import { getStorage } from '@/lib/storage'
import type { Role } from '@/lib/auth/types'

/**
 * Runtime, admin-editable settings (F1-backed) — the layer that makes the admin
 * dashboard *control* v2.1 features rather than just display config. Values here
 * override the git-committed defaults at request time.
 */
export interface AdminSettings {
  /** null → fall back to docs.json `ai.chat`; true/false → admin override. */
  chatEnabled: boolean | null
  /** Extra OIDC access domains, merged with the git-committed `team.domains`. */
  allowedDomains: Array<{ domain: string; role: Role }>
}

const NS = 'admin_settings'
const KEY = 'settings'
const DEFAULTS: AdminSettings = { chatEnabled: null, allowedDomains: [] }

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const stored = await getStorage().kvGet<Partial<AdminSettings>>(NS, KEY)
    return {
      chatEnabled: typeof stored?.chatEnabled === 'boolean' ? stored.chatEnabled : DEFAULTS.chatEnabled,
      allowedDomains: Array.isArray(stored?.allowedDomains) ? stored!.allowedDomains! : DEFAULTS.allowedDomains,
    }
  } catch {
    return DEFAULTS
  }
}

export async function updateAdminSettings(patch: Partial<AdminSettings>): Promise<AdminSettings> {
  const current = await getAdminSettings()
  const next: AdminSettings = { ...current, ...patch }
  await getStorage().kvSet(NS, KEY, next)
  return next
}
