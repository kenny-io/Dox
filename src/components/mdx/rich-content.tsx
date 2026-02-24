import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ZoomableContent } from '@/components/mdx/zoomable-content'
import {
  BookOpen,
  Code2,
  Grid3X3,
  Link2,
  PartyPopper,
  Send,
  Mail,
  Twitter,
  Wrench,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type IconName =
  | 'book-open'
  | 'code-simple'
  | 'grid-round'
  | 'link-simple'
  | 'wrench'
  | 'party-horn'
  | 'telegram'
  | 'envelope'
  | 'x-twitter'
  | 'message'

const iconMap: Record<IconName, LucideIcon> = {
  'book-open': BookOpen,
  'code-simple': Code2,
  'grid-round': Grid3X3,
  'link-simple': Link2,
  wrench: Wrench,
  'party-horn': PartyPopper,
  telegram: Send,
  envelope: Mail,
  'x-twitter': Twitter,
  message: MessageSquare,
}

export interface IconProps {
  icon: IconName | string
  iconType?: 'solid' | 'outline'
  className?: string
}

export function Icon({ icon, className }: IconProps) {
  const Component = iconMap[icon as IconName] ?? MessageSquare
  return <Component className={cn('h-5 w-5 text-accent', className)} aria-hidden="true" />
}

interface CardProps {
  title?: string
  href?: string
  icon?: IconName
  iconType?: 'solid' | 'outline'
  img?: string
  children?: ReactNode
}

function isExternalLink(href: string) {
  return href.startsWith('http')
}

export function Card({ title, href, icon, iconType, img, children }: CardProps) {
  const content = (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border/40 bg-background/95 p-5 shadow-sm transition hover:border-accent/60">
      {img ? (
        <div className="relative overflow-hidden rounded-xl border border-border/30">
          <Image
            src={img}
            alt={title ?? ''}
            width={1280}
            height={720}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {icon ? <Icon icon={icon} iconType={iconType} /> : null}
        {title ? <p className="text-base font-semibold text-foreground">{title}</p> : null}
      </div>
      {children ? <div className="prose prose-sm text-foreground/80 dark:prose-invert">{children}</div> : null}
    </article>
  )

  if (href) {
    const external = isExternalLink(href)
    return (
      <Link
        href={href}
        className="block h-full"
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
      >
        {content}
      </Link>
    )
  }

  return content
}

interface CardGroupProps {
  cols?: number | string
  children: ReactNode
}

const columnClassnames: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

export function CardGroup({ cols = 3, children }: CardGroupProps) {
  const colCount = typeof cols === 'string' ? parseInt(cols, 10) : cols
  const colClass = columnClassnames[colCount] ?? columnClassnames[3]
  return <div className={cn('grid grid-cols-1 gap-6', colClass)}>{children}</div>
}

interface ColumnsProps {
  cols?: number | string
  children: ReactNode
}

export function Columns({ cols = 2, children }: ColumnsProps) {
  const colCount = typeof cols === 'string' ? parseInt(cols, 10) : cols
  const colClass = columnClassnames[colCount] ?? columnClassnames[2]
  return <div className={cn('grid grid-cols-1 gap-6', colClass)}>{children}</div>
}

interface FrameProps {
  caption?: string
  zoom?: boolean
  children: ReactNode
}

export function Frame({ caption, zoom = true, children }: FrameProps) {
  return (
    <figure className="my-6 overflow-hidden rounded-3xl border border-border/40 bg-background">
      {zoom ? (
        <ZoomableContent><div className="p-5">{children}</div></ZoomableContent>
      ) : (
        <div className="p-5">{children}</div>
      )}
      {caption ? <figcaption className="border-t border-border/40 px-5 py-3 text-sm text-foreground/70">{caption}</figcaption> : null}
    </figure>
  )
}

interface TooltipProps {
  tip: string
  children: ReactNode
}

export function Tooltip({ tip, children }: TooltipProps) {
  return (
    <span className="cursor-help underline decoration-dotted underline-offset-4" title={tip}>
      {children}
    </span>
  )
}

interface AccordionProps {
  title: string
  children: ReactNode
}

export function Accordion({ title, children }: AccordionProps) {
  return (
    <details className="rounded-2xl border border-border/40 bg-background/80 p-4">
      <summary className="cursor-pointer list-none text-base font-semibold text-foreground">{title}</summary>
      <div className="mt-3 space-y-2 text-sm text-foreground/80">{children}</div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
}

const badgeVariantStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted text-foreground border-border/60',
  success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  danger: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  info: 'bg-accent/10 text-accent border-accent/30 dark:bg-accent/15 dark:text-accent dark:border-accent/30',
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', badgeVariantStyles[variant])}>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Update (changelog entry)
// ---------------------------------------------------------------------------

interface UpdateProps {
  label?: string
  date?: string
  children: ReactNode
}

export function Update({ label, date, children }: UpdateProps) {
  return (
    <div className="not-prose my-8 border-l-2 border-accent pl-6">
      {(label || date) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {label && (
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {label}
            </span>
          )}
          {date && <time className="text-sm text-foreground/50">{date}</time>}
        </div>
      )}
      <div className="prose prose-sm dark:prose-invert">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RequestExample / ResponseExample
// ---------------------------------------------------------------------------

interface RequestExampleProps {
  children: ReactNode
}

export function RequestExample({ children }: RequestExampleProps) {
  return (
    <div className="not-prose my-6">
      <div className="flex items-center gap-2 rounded-t-2xl border border-b-0 border-border/40 bg-muted/60 px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-blue-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Request</span>
      </div>
      <div className="[&>*]:!rounded-t-none [&>*]:!border-t-0">{children}</div>
    </div>
  )
}

interface ResponseExampleProps {
  children: ReactNode
}

export function ResponseExample({ children }: ResponseExampleProps) {
  return (
    <div className="not-prose my-6">
      <div className="flex items-center gap-2 rounded-t-2xl border border-b-0 border-border/40 bg-muted/60 px-4 py-2">
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Response</span>
      </div>
      <div className="[&>*]:!rounded-t-none [&>*]:!border-t-0">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface PanelProps {
  title?: string
  children: ReactNode
}

export function Panel({ title, children }: PanelProps) {
  return (
    <div className="not-prose my-6 rounded-2xl border border-border/40 bg-muted/30 px-5 py-4">
      {title && <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>}
      <div className="prose prose-sm dark:prose-invert text-foreground/80">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tile / TileGroup
// ---------------------------------------------------------------------------

interface TileProps {
  title?: string
  href?: string
  icon?: string
  img?: string
  children?: ReactNode
}

export function Tile({ title, href, icon, iconType, img, children }: TileProps & { iconType?: 'solid' | 'outline' }) {
  const content = (
    <article className="group flex h-full flex-col gap-4 rounded-2xl border border-border/40 bg-background/95 p-6 shadow-sm transition hover:border-accent/60 hover:shadow-md">
      {img ? (
        <div className="relative overflow-hidden rounded-xl border border-border/30 bg-muted">
          <Image
            src={img}
            alt={title ?? ''}
            width={1280}
            height={720}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="h-40 w-full object-cover transition group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        {icon ? <Icon icon={icon} iconType={iconType} className="h-6 w-6" /> : null}
        {title ? <p className="text-lg font-semibold text-foreground">{title}</p> : null}
      </div>
      {children ? <div className="prose prose-sm text-foreground/70 dark:prose-invert">{children}</div> : null}
    </article>
  )

  if (href) {
    const external = isExternalLink(href)
    return (
      <Link href={href} className="block h-full" target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {content}
      </Link>
    )
  }
  return content
}

interface TileGroupProps {
  cols?: number | string
  children: ReactNode
}

export function TileGroup({ cols = 2, children }: TileGroupProps) {
  const colCount = typeof cols === 'string' ? parseInt(cols, 10) : cols
  const colClass = columnClassnames[colCount] ?? columnClassnames[2]
  return <div className={cn('grid grid-cols-1 gap-8', colClass)}>{children}</div>
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

interface PromptProps {
  children: ReactNode
}

export function Prompt({ children }: PromptProps) {
  return (
    <div className="not-prose my-6 overflow-hidden rounded-2xl border border-border/40 bg-muted/20 font-mono text-sm">
      {children}
    </div>
  )
}

interface PromptUserProps {
  children: ReactNode
}

export function PromptUser({ children }: PromptUserProps) {
  return (
    <div className="flex gap-3 border-b border-border/30 bg-background px-4 py-3">
      <span className="shrink-0 select-none font-semibold text-accent">$</span>
      <span className="text-foreground/90">{children}</span>
    </div>
  )
}

interface PromptAssistantProps {
  children: ReactNode
}

export function PromptAssistant({ children }: PromptAssistantProps) {
  return (
    <div className="px-4 py-3 text-foreground/70">
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color swatch
// ---------------------------------------------------------------------------

interface ColorProps {
  hex: string
  name?: string
}

export function Color({ hex, name }: ColorProps) {
  return (
    <div className="not-prose inline-flex flex-col items-start gap-2">
      <div
        className="h-12 w-24 rounded-lg border border-border/40 shadow-sm"
        style={{ backgroundColor: hex }}
        aria-label={name ?? hex}
      />
      {name && <span className="text-sm font-medium text-foreground">{name}</span>}
      <code className="text-xs text-foreground/50">{hex}</code>
    </div>
  )
}

