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

/**
 * Write-only secret editor — never renders the value. `pending` is the staged
 * edit held by the parent draft: a string to set, null to clear, undefined for
 * unchanged. Saved by the group's global Save button.
 */
function SecretRow({
  label,
  desc,
  isSet,
  pending,
  disabled,
  placeholder,
  onChange,
}: {
  label: string
  desc: React.ReactNode
  isSet: boolean
  pending: string | null | undefined
  disabled: boolean
  placeholder: string
  onChange: (v: string | null | undefined) => void
}) {
  const status =
    pending === null ? 'Will clear on save' : typeof pending === 'string' ? 'Will set on save' : isSet ? 'Configured' : 'Not set'
  const statusColor = pending !== undefined ? 'var(--ds-accent-mid)' : 'var(--ds-text-muted)'
  return (
    <div className="ds-setting-row" style={{ alignItems: 'flex-start' }}>
      <div className="min-w-0">
        <div className="ds-setting-row-label">{label}</div>
        <div className="ds-setting-row-desc">{desc}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', minWidth: 220 }}>
        {!disabled ? (
          <div className="flex items-center gap-2">
            <input
              type="password"
              className="ds-input ds-focusable"
              style={{ width: 160 }}
              placeholder={placeholder}
              value={typeof pending === 'string' ? pending : ''}
              onChange={(e) => onChange(e.target.value ? e.target.value : undefined)}
            />
            {isSet ? (
              <button
                type="button"
                className="ds-btn ds-btn--ghost ds-btn--sm ds-focusable"
                onClick={() => onChange(pending === null ? undefined : null)}
              >
                {pending === null ? 'Keep' : 'Clear'}
              </button>
            ) : null}
          </div>
        ) : null}
        <span style={{ fontSize: 'var(--ds-text-caption)', color: statusColor }}>{status}</span>
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
  const [draft, setDraft] = useState<{
    chatEnabled: boolean | null
    analyticsEnabled: boolean | null
    allowedDomains: Array<Domain>
  } | null>(null)
  const [pendDocs, setPendDocs] = useState<string | null | undefined>(undefined)
  const [pendKey, setPendKey] = useState<string | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [newRole, setNewRole] = useState<Role>('viewer')

  function load(s: Settings) {
    setSettings(s)
    setDraft({ chatEnabled: s.chatEnabled, analyticsEnabled: s.analyticsEnabled, allowedDomains: s.allowedDomains })
    setPendDocs(undefined)
    setPendKey(undefined)
  }
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && load(s))
      .catch(() => {})
  }, [])

  if (!settings || !draft) return null

  const dirty =
    draft.chatEnabled !== settings.chatEnabled ||
    draft.analyticsEnabled !== settings.analyticsEnabled ||
    JSON.stringify(draft.allowedDomains) !== JSON.stringify(draft.allowedDomains) ||
    pendDocs !== undefined ||
    pendKey !== undefined

  async function saveAll() {
    if (!canEdit || !dirty || !draft) return
    setSaving(true)
    setSaved(false)
    setError(null)
    const patch: Record<string, unknown> = {
      chatEnabled: draft.chatEnabled,
      analyticsEnabled: draft.analyticsEnabled,
      allowedDomains: draft.allowedDomains,
    }
    if (pendDocs !== undefined) patch.docsPassword = pendDocs
    if (pendKey !== undefined) patch.chatKey = pendKey
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        load(await res.json())
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const body = await res.json().catch(() => ({}))
        const hint = res.status === 401 || res.status === 403 ? ' — you need Owner access' : ''
        setError(body.error ?? `Save failed (HTTP ${res.status}${hint})`)
      }
    } catch {
      setError('Save failed — could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  const chatOn = draft.chatEnabled ?? true
  const analyticsOn = draft.analyticsEnabled ?? true

  return (
    <section className="ds-setting-group">
      <div className="ds-setting-group-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div className="min-w-0">
          <h2 className="ds-setting-group-title">Controls</h2>
          <p className="ds-setting-group-desc">
            {canEdit ? 'Make your changes, then Save. Nothing is written until you do.' : 'Owner access required to edit.'}
          </p>
        </div>
        {canEdit ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              className="ds-btn ds-btn--primary ds-btn--sm ds-focusable"
              disabled={!dirty || saving}
              onClick={saveAll}
              style={{ opacity: !dirty && !saving ? 0.55 : 1 }}
            >
              {saving ? 'Saving…' : dirty ? 'Save settings' : 'Saved'}
            </button>
            {saved ? <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-success)' }}>Saved ✓</span> : null}
            {error ? (
              <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-danger)', maxWidth: 240, textAlign: 'right' }}>{error}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="ds-setting-list">
        <ToggleRow
          label="AI Chat widget"
          desc="Show the assistant on the docs site"
          on={chatOn}
          disabled={!canEdit}
          onToggle={() => setDraft({ ...draft, chatEnabled: !chatOn })}
        />
        <ToggleRow
          label="Analytics collection"
          desc="Record page views + agent traffic for the dashboard"
          on={analyticsOn}
          disabled={!canEdit}
          onToggle={() => setDraft({ ...draft, analyticsEnabled: !analyticsOn })}
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
          pending={pendDocs}
          disabled={!canEdit}
          placeholder="new password"
          onChange={setPendDocs}
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
          pending={pendKey}
          disabled={!canEdit}
          placeholder="sk-ant-…"
          onChange={setPendKey}
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
              {draft.allowedDomains.length === 0 ? (
                <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>None</span>
              ) : (
                draft.allowedDomains.map((d, i) => (
                  <span key={`${d.domain}-${i}`} className="ds-chip ds-chip--neutral">
                    @{d.domain} → {d.role}
                    {canEdit ? (
                      <button
                        type="button"
                        aria-label={`Remove ${d.domain}`}
                        onClick={() => setDraft({ ...draft, allowedDomains: draft.allowedDomains.filter((_, j) => j !== i) })}
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
                  disabled={!newDomain.trim()}
                  onClick={() => {
                    const domain = newDomain.trim().toLowerCase().replace(/^@/, '')
                    if (!domain) return
                    setDraft({ ...draft, allowedDomains: [...draft.allowedDomains, { domain, role: newRole }] })
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
