import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
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
  return <Component className={cn('h-5 w-5 text-emerald-500', className)} aria-hidden="true" />
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
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-border/40 bg-background/95 p-5 shadow-sm transition hover:border-emerald-400/70">
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
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
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
  children: ReactNode
}

export function Frame({ caption, children }: FrameProps) {
  return (
    <figure className="my-6 space-y-3 rounded-3xl border border-border/40 bg-muted/30 p-5">
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-background">{children}</div>
      {caption ? <figcaption className="text-sm text-foreground/70">{caption}</figcaption> : null}
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

