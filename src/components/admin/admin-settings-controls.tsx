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
  analyticsEnabled: boolean | null
  allowedDomains: Array<Domain>
  hasDocsPassword: boolean
  hasChatKey: boolean
}

/** Write-only secret setter — shows Set/Not set, never a value. */
function SecretRow({
  label,
  desc,
  isSet,
  disabled,
  placeholder,
  onSave,
  onClear,
}: {
  label: string
  desc: React.ReactNode
  isSet: boolean
  disabled: boolean
  placeholder: string
  onSave: (value: string) => void
  onClear: () => void
}) {
  const [value, setValue] = useState('')
  return (
    <div className="ds-setting-row" style={{ alignItems: 'flex-start' }}>
      <div className="min-w-0">
        <div className="ds-setting-row-label">{label}</div>
        <div className="ds-setting-row-desc">{desc}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 240 }}>
        <span className={`ds-chip ds-chip--${isSet ? 'success' : 'neutral'}`}>
          {isSet ? <span className="ds-dot" /> : null}
          {isSet ? 'Set' : 'Not set'}
        </span>
        {!disabled ? (
          <div className="flex items-center gap-2">
            <input
              type="password"
              className="ds-input ds-focusable"
              style={{ width: 150 }}
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button
              type="button"
              className="ds-btn ds-btn--secondary ds-btn--sm ds-focusable"
              disabled={!value.trim()}
              onClick={() => {
                onSave(value)
                setValue('')
              }}
            >
              Set
            </button>
            {isSet ? (
              <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm ds-focusable" onClick={onClear}>
                Clear
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Switch({ on, disabled, onToggle }: { on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className="ds-focusable"
      style={{
        width: 42,
        height: 24,
        flexShrink: 0,
        borderRadius: 999,
        border: 'none',
        padding: 2,
        background: on ? 'var(--ds-accent)' : 'var(--ds-surface-active)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.15s ease',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: '#fff',
          transform: on ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

function ToggleRow({
  label,
  desc,
  on,
  disabled,
  onToggle,
}: {
  label: string
  desc: string
  on: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="ds-setting-row">
      <div className="min-w-0">
        <div className="ds-setting-row-label">{label}</div>
        <div className="ds-setting-row-desc">{desc}</div>
      </div>
      <Switch on={on} disabled={disabled} onToggle={onToggle} />
    </div>
  )
}

function LocalizationSection({
  locales,
  repoUrl,
  canEdit,
}: {
  locales: Array<{ code: string; label: string }>
  repoUrl: string
  canEdit: boolean
}) {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const editUrl = repoUrl ? `${repoUrl.replace(/\/$/, '')}/edit/main/docs.json` : ''
  const valid = /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(code.trim()) && Boolean(label.trim())
  const snippet = valid ? `{ "code": "${code.trim()}", "label": "${label.trim()}" }` : ''

  return (
    <div className="ds-setting-row" style={{ alignItems: 'flex-start' }}>
      <div className="min-w-0">
        <div className="ds-setting-row-label">Languages</div>
        <div className="ds-setting-row-desc">
          Supported locales (<code className="font-mono">docs.json</code> i18n). Adding one is a reviewed config change; translate
          content with <code className="font-mono">dox translate</code>.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 240 }}>
        <div className="flex flex-wrap justify-end gap-2">
          {locales.length === 0 ? (
            <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>Single language</span>
          ) : (
            locales.map((l) => (
              <span key={l.code} className="ds-chip ds-chip--neutral">
                {l.label} ({l.code})
              </span>
            ))
          )}
        </div>
        {canEdit ? (
          <>
            <div className="flex items-center gap-2">
              <input
                className="ds-input ds-focusable"
                style={{ width: 70 }}
                placeholder="es"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <input
                className="ds-input ds-focusable"
                style={{ width: 130 }}
                placeholder="Español"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            {valid ? (
              <>
                <pre
                  className="mt-1 overflow-x-auto p-2"
                  style={{ background: 'var(--ds-surface-tint)', borderRadius: 'var(--ds-radius-md)', fontSize: 'var(--ds-text-caption)' }}
                >
                  {snippet}
                </pre>
                {editUrl ? (
                  <a href={editUrl} target="_blank" rel="noreferrer" className="ds-btn ds-btn--secondary ds-btn--sm ds-focusable">
                    Add to docs.json on GitHub
                  </a>
                ) : (
                  <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>
                    Add the snippet to <code className="font-mono">docs.json</code> → <code className="font-mono">i18n.locales</code>.
                  </span>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

export function AdminSettingsControls({
  canEdit,
  i18nLocales,
  repoUrl,
}: {
  canEdit: boolean
  i18nLocales: Array<{ code: string; label: string }>
  repoUrl: string
}) {
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

  async function save(patch: Record<string, unknown>) {
    if (!canEdit || !settings) return
    setSettings({ ...settings, ...(patch as Partial<Settings>) }) // optimistic (non-secret fields)
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
  const analyticsOn = settings.analyticsEnabled ?? true

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
        <ToggleRow
          label="AI Chat widget"
          desc="Show the assistant on the docs site"
          on={chatOn}
          disabled={!canEdit || saving}
          onToggle={() => save({ chatEnabled: !chatOn })}
        />
        <ToggleRow
          label="Analytics collection"
          desc="Record page views + agent traffic for the dashboard"
          on={analyticsOn}
          disabled={!canEdit || saving}
          onToggle={() => save({ analyticsEnabled: !analyticsOn })}
        />

        <SecretRow
          label="Docs access password"
          desc={
            <>
              Password for the private-docs visitor gate. Set <code className="font-mono">DOX_ACCESS_PASSWORD</code> (any value) to
              turn the gate on; this password then takes precedence.
            </>
          }
          isSet={settings.hasDocsPassword}
          disabled={!canEdit || saving}
          placeholder="new password"
          onSave={(v) => save({ docsPassword: v })}
          onClear={() => save({ docsPassword: null })}
        />

        <SecretRow
          label="AI Chat API key"
          desc={
            <>
              Anthropic API key for the assistant, <strong>encrypted at rest</strong>. Overrides the{' '}
              <code className="font-mono">ANTHROPIC_API_KEY</code> env. Requires <code className="font-mono">DOX_AUTH_SECRET</code>.
            </>
          }
          isSet={settings.hasChatKey}
          disabled={!canEdit || saving}
          placeholder="sk-ant-…"
          onSave={(v) => save({ chatKey: v })}
          onClear={() => save({ chatKey: null })}
        />

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

        <LocalizationSection locales={i18nLocales} repoUrl={repoUrl} canEdit={canEdit} />
      </div>
    </section>
  )
}
