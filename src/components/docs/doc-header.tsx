import type { DocEntry } from '@/data/docs'

interface DocHeaderProps {
  doc: DocEntry
}

export function DocHeader({ doc }: DocHeaderProps) {
  return (
    <header className="mb-10 space-y-4">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-foreground/70">{doc.description}</p>
      </div>
    </header>
  )
}

