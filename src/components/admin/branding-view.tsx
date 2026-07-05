'use client'

import { useDeferredValue, useEffect, useState } from 'react'
import { Check, Upload } from 'lucide-react'

type ThemeId = 'default' | 'maple' | 'sharp' | 'minimal'

function AssetUpload({
  kind,
  label,
  hint,
  hasAsset,
  version,
  canEdit,
  onChange,
}: {
  kind: 'logo' | 'favicon'
  label: string
  hint: string
  hasAsset: boolean
  version: number
  canEdit: boolean
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError('PNG, JPEG or WebP only')
    if (file.size > 150 * 1024) return setError('Max 150KB')
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    setBusy(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [kind]: dataUri }),
      })
      if (res.ok) onChange()
      else setError((await res.json().catch(() => ({}))).error ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [kind]: null }),
      })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ds-setting-row" style={{ alignItems: 'flex-start' }}>
      <div className="min-w-0">
        <div className="ds-setting-row-label">{label}</div>
        <div className="ds-setting-row-desc">{hint}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', minWidth: 200 }}>
        {hasAsset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/brand/${kind}?v=${version}`}
            alt=""
            style={{ height: kind === 'favicon' ? 24 : 30, width: 'auto', borderRadius: 6, background: '#fff', padding: 3 }}
          />
        ) : (
          <span className="ds-chip ds-chip--neutral">Default (Dox)</span>
        )}
        {canEdit ? (
          <div className="flex items-center gap-2">
            <label className="ds-btn ds-btn--secondary ds-btn--sm ds-focusable" style={{ cursor: 'pointer' }}>
              <Upload className="h-3.5 w-3.5" /> {busy ? '…' : 'Upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void upload(f)
                  e.target.value = ''
                }}
              />
            </label>
            {hasAsset ? (
              <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm ds-focusable" onClick={() => void clear()}>
                Remove
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-danger)' }}>{error}</span> : null}
      </div>
    </div>
  )
}

const THEMES: Array<{ id: ThemeId; name: string; desc: string; radius: string }> = [
  { id: 'default', name: 'Default', desc: 'Balanced, rounded', radius: '0.5rem' },
  { id: 'maple', name: 'Maple', desc: 'Soft, generous curves', radius: '1rem' },
  { id: 'sharp', name: 'Sharp', desc: 'Crisp, near-square', radius: '0.125rem' },
  { id: 'minimal', name: 'Minimal', desc: 'Understated, flat', radius: '0.375rem' },
]

export function BrandingView({
  currentTheme,
  currentAccentLight,
  currentAccentDark,
  repoUrl,
  canEdit,
}: {
  currentTheme: ThemeId
  currentAccentLight: string
  currentAccentDark: string
  repoUrl: string
  canEdit: boolean
}) {
  const [theme, setTheme] = useState<ThemeId>(currentTheme)
  const [accentLight, setAccentLight] = useState(currentAccentLight)
  const [accentDark, setAccentDark] = useState(currentAccentDark)
  // Persisted baseline (F1, or the build props) — diff against it for `dirty`.
  const [savedTheme, setSavedTheme] = useState<ThemeId>(currentTheme)
  const [savedLight, setSavedLight] = useState(currentAccentLight)
  const [savedDark, setSavedDark] = useState(currentAccentDark)
  const [assets, setAssets] = useState({ hasLogo: false, hasFavicon: false })
  const [assetVersion, setAssetVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refreshAssets() {
    setAssetVersion((v) => v + 1)
    fetch('/api/admin/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s) return
        setAssets({ hasLogo: Boolean(s.hasLogo), hasFavicon: Boolean(s.hasFavicon) })
        const t = (s.brandTheme as ThemeId) || currentTheme
        const l = s.brandAccent?.light || currentAccentLight
        const d = s.brandAccent?.dark || currentAccentDark
        setTheme(t)
        setSavedTheme(t)
        setAccentLight(l)
        setSavedLight(l)
        setAccentDark(d)
        setSavedDark(d)
      })
      .catch(() => {})
  }
  useEffect(() => {
    refreshAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = theme !== savedTheme || accentLight !== savedLight || accentDark !== savedDark

  async function saveBranding() {
    if (!canEdit || !dirty) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandTheme: theme, brandAccent: { light: accentLight, dark: accentDark } }),
      })
      if (res.ok) {
        setSavedTheme(theme)
        setSavedLight(accentLight)
        setSavedDark(accentDark)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const b = await res.json().catch(() => ({}))
        const hint = res.status === 401 || res.status === 403 ? ' — you need Owner access' : ''
        setError(b.error ?? `Save failed (HTTP ${res.status}${hint})`)
      }
    } catch {
      setError('Save failed — could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  function resetBranding() {
    setTheme(currentTheme)
    setAccentLight(currentAccentLight)
    setAccentDark(currentAccentDark)
  }

  // Deferred so dragging the color picker doesn't refetch the OG image on every frame.
  const deferredAccent = useDeferredValue(accentDark)
  const ogSrc = `/api/og?title=${encodeURIComponent('Overview')}&group=${encodeURIComponent('Introduction')}&description=${encodeURIComponent('Your page previews, styled from your brand.')}&accent=${encodeURIComponent(deferredAccent)}`

  const radius = THEMES.find((t) => t.id === theme)?.radius ?? '0.5rem'
  const overridden = theme !== currentTheme || accentLight !== currentAccentLight || accentDark !== currentAccentDark

  return (
    <div className="ds-rise">
      <header className="mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
        <div className="min-w-0">
          <div className="ds-eyebrow">Appearance</div>
          <h1 style={{ fontFamily: 'var(--ds-font-heading)', fontSize: 'var(--ds-text-h2)', fontWeight: 'var(--ds-fw-bold)', lineHeight: 1.1 }}>
            Branding
          </h1>
          <p className="mt-1.5 max-w-[62ch]" style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
            Pick your theme, brand color, logo and favicon, then Save. Applies to the live docs site — no merge or rebuild.
          </p>
        </div>
        {canEdit ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              className="ds-btn ds-btn--primary ds-focusable"
              disabled={!dirty || saving}
              onClick={saveBranding}
              style={{ opacity: !dirty && !saving ? 0.55 : 1 }}
            >
              {saving ? 'Saving…' : dirty ? 'Save branding' : 'Saved'}
            </button>
            {saved ? <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-success)' }}>Saved ✓</span> : null}
            {error ? (
              <span style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-danger)', maxWidth: 220, textAlign: 'right' }}>{error}</span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Controls */}
        <div className="space-y-6">
          <section className="ds-panel">
            <div className="ds-panel-head"><div className="ds-panel-title">Structural theme</div></div>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => {
                const active = t.id === theme
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    disabled={!canEdit}
                    className="ds-focusable"
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      minWidth: 150,
                      borderRadius: 'var(--ds-radius-lg)',
                      border: `1.5px solid ${active ? 'var(--ds-accent-mid)' : 'var(--ds-border)'}`,
                      background: active ? 'var(--ds-surface-tint)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center gap-1.5" style={{ fontWeight: 'var(--ds-fw-semibold)', fontSize: 'var(--ds-text-sm)' }}>
                      {t.name}
                      {active ? <Check className="h-3.5 w-3.5" style={{ color: 'var(--ds-accent-mid)' }} /> : null}
                    </div>
                    <div style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="ds-panel">
            <div className="ds-panel-head"><div className="ds-panel-title">Brand accent</div></div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input type="color" value={accentLight} disabled={!canEdit} onChange={(e) => setAccentLight(e.target.value)} style={{ width: 40, height: 32, border: 'none', background: 'none' }} />
                <span>
                  <span className="ds-rail-label block">Light</span>
                  <span className="font-mono" style={{ fontSize: 'var(--ds-text-caption)' }}>{accentLight}</span>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input type="color" value={accentDark} disabled={!canEdit} onChange={(e) => setAccentDark(e.target.value)} style={{ width: 40, height: 32, border: 'none', background: 'none' }} />
                <span>
                  <span className="ds-rail-label block">Dark</span>
                  <span className="font-mono" style={{ fontSize: 'var(--ds-text-caption)' }}>{accentDark}</span>
                </span>
              </label>
            </div>
          </section>

          <section className="ds-panel">
            <div className="ds-panel-head"><div className="ds-panel-title">Logo &amp; favicon</div></div>
            <div className="ds-setting-list">
              <AssetUpload
                kind="logo"
                label="Logo"
                hint="Header + social cards. PNG/JPEG/WebP, ≤150KB."
                hasAsset={assets.hasLogo}
                version={assetVersion}
                canEdit={canEdit}
                onChange={refreshAssets}
              />
              <AssetUpload
                kind="favicon"
                label="Favicon"
                hint="Browser-tab icon. A square PNG works best."
                hasAsset={assets.hasFavicon}
                version={assetVersion}
                canEdit={canEdit}
                onChange={refreshAssets}
              />
            </div>
          </section>

          <section className="ds-panel">
            <div className="ds-panel-head">
              <div className="ds-panel-title">Status</div>
              {dirty ? <span className="ds-chip ds-chip--warn">Unsaved</span> : null}
            </div>
            <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)' }}>
              {canEdit
                ? dirty
                  ? 'You have unsaved changes. Logo & favicon uploads save on upload; theme + accent apply when you hit Save.'
                  : 'Theme + accent are live on the docs site. Logo & favicon save on upload.'
                : 'Only an Owner can change branding.'}
            </p>
            {canEdit && overridden ? (
              <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm ds-focusable mt-3" onClick={resetBranding}>
                Reset to defaults
              </button>
            ) : null}
          </section>
        </div>

        {/* Live preview */}
        <section className="ds-panel" style={{ position: 'sticky', top: 16 }}>
          <div className="ds-panel-head"><div className="ds-panel-title">Preview</div></div>
          <div style={{ border: '1px solid var(--ds-border)', borderRadius: radius, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ds-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 22, height: 22, borderRadius: radius, background: accentLight, display: 'inline-block' }} />
              <strong style={{ fontSize: 'var(--ds-text-sm)' }}>Docs</strong>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 92, padding: 10, borderRight: '1px solid var(--ds-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, background: accentLight, color: '#fff', borderRadius: radius, padding: '3px 8px' }}>Overview</span>
                <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', padding: '3px 8px' }}>Guides</span>
                <span style={{ fontSize: 11, color: 'var(--ds-text-muted)', padding: '3px 8px' }}>API</span>
              </div>
              <div style={{ flex: 1, padding: 14 }}>
                <div style={{ fontWeight: 'var(--ds-fw-bold)', fontSize: 'var(--ds-text-sm)' }}>Getting started</div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', marginTop: 4, lineHeight: 1.5 }}>A short paragraph of body copy showing your theme radius and accent.</div>
                <button type="button" style={{ marginTop: 10, background: accentLight, color: '#fff', border: 'none', borderRadius: radius, padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
                  Primary action
                </button>
              </div>
            </div>
          </div>
          <p className="mt-3" style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>
            Approximate preview. The exact theme applies site-wide as soon as you Save.
          </p>

          <div className="ds-panel-head mt-6"><div className="ds-panel-title">Social preview (OG image)</div></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ogSrc}
            alt="Social share preview"
            width={1200}
            height={630}
            style={{ width: '100%', height: 'auto', borderRadius: 'var(--ds-radius-lg)', border: '1px solid var(--ds-border)' }}
          />
          <p className="mt-2" style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>
            Every page's link preview (Slack, X, iMessage…) is generated from your brand. This reflects the dark accent above.
          </p>
        </section>
      </div>
    </div>
  )
}
