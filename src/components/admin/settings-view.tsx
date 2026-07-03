import type { ReactNode } from 'react'
import { siteConfig } from '@/data/site'
import { isAdminEnabled, isDocsAccessEnabled } from '@/lib/admin/auth'
import { getAiConfig, getI18nConfig, isAnalyticsEnabled } from '@/data/docs'

type Tone = 'success' | 'warn' | 'neutral'

function Row({ label, value, tone = 'neutral', hint }: { label: string; value: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3.5 last:border-b-0" style={{ borderColor: 'var(--ds-border-subtle)' }}>
      <div className="min-w-0">
        <div style={{ fontSize: 'var(--ds-text-body)', fontWeight: 'var(--ds-fw-medium)', color: 'var(--ds-text-primary)' }}>{label}</div>
        {hint ? <div style={{ fontSize: 'var(--ds-text-caption)', color: 'var(--ds-text-muted)' }}>{hint}</div> : null}
      </div>
      <span className={`ds-chip shrink-0 ds-chip--${tone === 'neutral' ? 'neutral' : tone}`}>{value}</span>
    </div>
  )
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="ds-panel">
      <div className="ds-panel-head">
        <div>
          <div className="ds-panel-title">{title}</div>
          {sub ? <div className="ds-panel-sub">{sub}</div> : null}
        </div>
      </div>
      <div>{children}</div>
    </div>
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
    <div className="space-y-6">
      <p style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-text-muted)', maxWidth: '60ch' }}>
        These reflect your current configuration. Settings are managed in <code style={{ fontFamily: 'var(--ds-font-mono)' }}>docs.json</code>,{' '}
        <code style={{ fontFamily: 'var(--ds-font-mono)' }}>src/data/site.ts</code>, and environment variables — see the{' '}
        <a href="/guides/extending" style={{ color: 'var(--ds-accent-mid)', fontWeight: 'var(--ds-fw-semibold)' }}>Extending Dox</a> guide.
      </p>

      <div className="dash-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Panel title="Site">
          <Row label="Name" value={siteConfig.name} />
          <Row label="Repository" value={siteConfig.repoUrl ? 'Linked' : 'Not set'} tone={siteConfig.repoUrl ? 'success' : 'neutral'} hint={siteConfig.repoUrl || undefined} />
          <Row label="Description" value={siteConfig.description ? 'Set' : 'Not set'} tone={siteConfig.description ? 'success' : 'neutral'} />
        </Panel>

        <Panel title="Access & authentication">
          <Row label="Admin dashboard" value={adminOn ? 'Enabled' : 'Off'} tone={adminOn ? 'success' : 'neutral'} hint="DOX_ADMIN_PASSWORD" />
          <Row label="Docs access protection" value={accessOn ? 'Password-gated' : 'Public'} tone={accessOn ? 'success' : 'neutral'} hint="DOX_ACCESS_PASSWORD" />
        </Panel>

        <Panel title="Analytics">
          <Row label="Collection" value={analyticsOn ? 'On' : 'Off'} tone={analyticsOn ? 'success' : 'neutral'} />
          <Row label="Store" value="Durable" tone="success" hint={analyticsStore()} />
        </Panel>

        <Panel title="AI chat">
          <Row label="Chat widget" value={chatStatus} tone={chatTone} hint="ANTHROPIC_API_KEY / DOX_TRIAL_ANTHROPIC_KEY" />
          <Row label="Retrieval" value="RAG + citations" tone="success" />
        </Panel>

        <Panel title="Localization">
          <Row
            label="Languages"
            value={i18n ? `${i18n.locales.length} locales` : 'Single locale'}
            tone={i18n ? 'success' : 'neutral'}
            hint={i18n ? i18n.locales.map((l) => l.code).join(', ') : 'en'}
          />
        </Panel>

        <Panel title="Agents">
          <Row label="Agent endpoints" value="Live" tone="success" hint="llms.txt, ai.txt, docs-index, agent-readiness" />
          <Row label="Structured data" value="JSON-LD" tone="success" />
        </Panel>
      </div>
    </div>
  )
}
