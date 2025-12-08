import type { DocEntry } from '@/data/docs'
import { Badge } from '@/components/ui/badge'
import { typography } from '@/config/layout'

interface DocHeaderProps {
  doc: DocEntry
}

export function DocHeader({ doc }: DocHeaderProps) {
  return (
    <header className="mb-10 space-y-4">
      <div className={`flex flex-wrap items-center gap-3 ${typography.meta}`}>
        <span>{doc.group}</span>
        <span className="text-foreground/30">•</span>
        <span>Updated {doc.lastUpdated}</span>
        <span className="text-foreground/30">•</span>
        <span>{doc.timeEstimate} read</span>
        {doc.badge ? <Badge className="tracking-tight">{doc.badge}</Badge> : null}
      </div>
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-foreground/70">{doc.description}</p>
      </div>
    </header>
  )
}

