'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Role } from '@/lib/auth/types'

interface Domain {
  domain: string
  role: Role
}
interface Settings {
  chatEnabled: boolean | null
  allowedDomains: Array<Domain>
}

export function AdminSettingsControls({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newRole, setNewRole] = useState<Role>('viewer')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSettings(s))
      .catch(() => {})
  }, [])

  async function save(patch: Partial<Settings>) {
    if (!canEdit || !settings) return
    setSettings({ ...settings, ...patch }) // optimistic
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        setSettings(await res.json())
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return null
  const chatOn = settings.chatEnabled ?? true

  return (
    <section className="ds-setting-group">
      <div className="ds-setting-group-head">
        <h2 className="ds-setting-group-title">Controls</h2>
        <p className="ds-setting-group-desc">
          Live settings — changes take effect immediately{canEdit ? '' : ' · Owner only'}.
          {saved ? <span style={{ color: 'var(--ds-success)', marginLeft: 8 }}>Saved ✓</span> : null}
        </p>
      </div>
      <div className="ds-setting-list">
        {/* AI Chat toggle */}
        <div className="ds-setting-row">
          <div className="min-w-0">
            <div className="ds-setting-row-label">AI Chat widget</div>
            <div className="ds-setting-row-desc">Show the assistant on the docs site</div>
          </div>
          <button
            type="button"
            aria-pressed={chatOn}
            disabled={!canEdit || saving}
            onClick={() => save({ chatEnabled: !chatOn })}
            className={`ds-chip ds-setting-row-value ds-chip--${chatOn ? 'success' : 'neutral'}`}
            style={{ cursor: canEdit ? 'pointer' : 'default', border: 'none' }}
          >
            {chatOn ? <span className="ds-dot" /> : null}
            {chatOn ? 'On' : 'Off'}
          </button>
        </div>

        {/* Allowed email domains */}
        <div className="ds-setting-row" style={{ alignItems: 'flex-start' }}>
          <div className="min-w-0">
            <div className="ds-setting-row-label">Allowed email domains</div>
            <div className="ds-setting-row-desc">
              Verified work emails in these domains can sign in (merged with docs.json <code className="font-mono">team.domains</code>)
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 240 }}>
            <div className="flex flex-wrap justify-end gap-2">
              {settings.allowedDomains.length === 0 ? (
                <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>None</span>
              ) : (
                settings.allowedDomains.map((d, i) => (
                  <span key={`${d.domain}-${i}`} className="ds-chip ds-chip--neutral">
                    @{d.domain} → {d.role}
                    {canEdit ? (
                      <button
                        type="button"
                        aria-label={`Remove ${d.domain}`}
                        onClick={() => save({ allowedDomains: settings.allowedDomains.filter((_, j) => j !== i) })}
                        style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                ))
              )}
            </div>
            {canEdit ? (
              <div className="flex items-center gap-2">
                <input
                  className="ds-input ds-focusable"
                  style={{ width: 130 }}
                  placeholder="acme.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <select className="ds-input ds-focusable" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="owner">owner</option>
                </select>
                <button
                  type="button"
                  className="ds-btn ds-btn--secondary ds-btn--sm ds-focusable"
                  disabled={saving || !newDomain.trim()}
                  onClick={() => {
                    const domain = newDomain.trim().toLowerCase().replace(/^@/, '')
                    if (!domain) return
                    save({ allowedDomains: [...settings.allowedDomains, { domain, role: newRole }] })
                    setNewDomain('')
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
