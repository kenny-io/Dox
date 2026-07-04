import type { ReactNode } from 'react'
import Link from 'next/link'
import { siteConfig } from '@/data/site'
import { isAdminEnabled, isDocsAccessEnabled } from '@/lib/admin/auth'
import { getAiConfig, getI18nConfig, isAnalyticsEnabled } from '@/data/docs'

type Tone = 'success' | 'warn' | 'neutral'

function Row({ label, value, tone = 'neutral', hint }: { label: string; value: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div className="ds-setting-row">
      <div className="min-w-0">
        <div className="ds-setting-row-label">{label}</div>
        {hint ? (
          <div className="ds-setting-row-desc" style={{ fontFamily: /[A-Z_]{4,}/.test(hint) ? 'var(--ds-font-mono)' : undefined }}>
            {hint}
          </div>
        ) : null}
      </div>
      <span className={`ds-chip ds-setting-row-value ds-chip--${tone === 'neutral' ? 'neutral' : tone}`}>
        {tone === 'success' ? <span className="ds-dot" /> : null}
        {value}
      </span>
    </div>
  )
}

function Group({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="ds-setting-group">
      <div className="ds-setting-group-head">
        <h2 className="ds-setting-group-title">{title}</h2>
        {desc ? <p className="ds-setting-group-desc">{desc}</p> : null}
      </div>
      <div className="ds-setting-list">{children}</div>
    </section>
  )
}

function analyticsStore(): string {
  const url = process.env.DOX_ANALYTICS_DB_URL?.trim()
  if (!url) return 'Embedded libSQL (.data/analytics/events.db)'
  if (url.startsWith('libsql://') || url.startsWith('https://')) return 'Turso / libSQL (remote)'
  return 'Custom libSQL file'
}

export function SettingsView() {
  const adminOn = isAdminEnabled()
  const accessOn = isDocsAccessEnabled()
  const analyticsOn = isAnalyticsEnabled()
  const ai = getAiConfig()
  const i18n = getI18nConfig()
  const ownerKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  const trialKey = Boolean(process.env.DOX_TRIAL_ANTHROPIC_KEY?.trim())
  const chatStatus = !ai.chat ? 'Off' : ownerKey ? 'Your key' : trialKey ? 'Trial key' : 'Needs a key'
  const chatTone: Tone = !ai.chat ? 'neutral' : ownerKey ? 'success' : trialKey ? 'warn' : 'warn'

  return (
    <div className="ds-rise">
      <header className="mb-8">
        <h1
          style={{
            fontFamily: 'var(--ds-font-heading)',
            fontSize: 'var(--ds-text-h2)',
            fontWeight: 'var(--ds-fw-bold)',
            letterSpacing: 'var(--ds-tracking-tight)',
            lineHeight: 1.1,
          }}
        >
          Settings
        </h1>
        <p className="mt-1.5" style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)', maxWidth: '64ch' }}>
          A read-only view of your current configuration. Values are managed in{' '}
          <code style={{ fontFamily: 'var(--ds-font-mono)' }}>docs.json</code>,{' '}
          <code style={{ fontFamily: 'var(--ds-font-mono)' }}>src/data/site.ts</code>, and environment variables — see the{' '}
          <Link href="/guides/extending" style={{ color: 'var(--ds-accent-mid)', fontWeight: 'var(--ds-fw-semibold)' }}>
            Extending Dox
          </Link>{' '}
          guide.
        </p>
      </header>

      <Group title="Site" desc="Identity and metadata for your documentation site.">
        <Row label="Name" value={siteConfig.name} />
        <Row
          label="Repository"
          value={siteConfig.repoUrl ? 'Linked' : 'Not set'}
          tone={siteConfig.repoUrl ? 'success' : 'neutral'}
          hint={siteConfig.repoUrl || undefined}
        />
        <Row label="Description" value={siteConfig.description ? 'Set' : 'Not set'} tone={siteConfig.description ? 'success' : 'neutral'} />
      </Group>

      <Group title="Access & authentication" desc="Who can reach the admin console and the docs themselves.">
        <Row label="Admin dashboard" value={adminOn ? 'Enabled' : 'Off'} tone={adminOn ? 'success' : 'neutral'} hint="DOX_ADMIN_PASSWORD" />
        <Row
          label="Docs access protection"
          value={accessOn ? 'Password-gated' : 'Public'}
          tone={accessOn ? 'success' : 'neutral'}
          hint="DOX_ACCESS_PASSWORD"
        />
      </Group>

      <Group title="Analytics" desc="First-party traffic and engagement collection.">
        <Row label="Collection" value={analyticsOn ? 'On' : 'Off'} tone={analyticsOn ? 'success' : 'neutral'} />
        <Row label="Store" value="Durable" tone="success" hint={analyticsStore()} />
      </Group>

      <Group title="AI chat" desc="The retrieval-augmented assistant embedded in your docs.">
        <Row label="Chat widget" value={chatStatus} tone={chatTone} hint="ANTHROPIC_API_KEY / DOX_TRIAL_ANTHROPIC_KEY" />
        <Row label="Retrieval" value="RAG + citations" tone="success" />
      </Group>

      <Group title="Localization" desc="Languages your documentation is available in.">
        <Row
          label="Languages"
          value={i18n ? `${i18n.locales.length} locales` : 'Single locale'}
          tone={i18n ? 'success' : 'neutral'}
          hint={i18n ? i18n.locales.map((l) => l.code).join(', ') : 'en'}
        />
      </Group>

      <Group title="Agents" desc="Machine-readable surfaces that make your docs agent-native.">
        <Row label="Agent endpoints" value="Live" tone="success" hint="llms.txt, ai.txt, docs-index, agent-readiness" />
        <Row label="Structured data" value="JSON-LD" tone="success" />
      </Group>
    </div>
  )
}
