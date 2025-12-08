'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
import { searchableDocs } from '@/data/docs'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

const parser = parseAsString.withDefault('')

export function CommandSearch() {
  const router = useRouter()
  const [query, setQuery] = useQueryState('q', parser)
  const [open, setOpen] = useState(false)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return searchableDocs.slice(0, 6)
    return searchableDocs
      .map((doc) => {
        const haystack = `${doc.title} ${doc.description} ${doc.keywords.join(' ')}`.toLowerCase()
        if (!haystack.includes(normalized)) return null
        const score =
          (doc.title.toLowerCase().includes(normalized) ? 2 : 0) +
          (doc.description.toLowerCase().includes(normalized) ? 1 : 0)
        return { doc, score }
      })
      .filter((item): item is { doc: (typeof searchableDocs)[number]; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.doc)
  }, [query])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function handleSelect(href: string) {
    router.push(href)
    setOpen(false)
  }

  return (
    <>
      <button
        className="hidden h-10 flex-1 items-center gap-3 rounded-full border border-border/70 px-4 text-left text-sm text-foreground/70 transition hover:border-border lg:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 text-foreground/50" />
        <span className="flex-1 truncate">{query ? query : 'Search the docs'}</span>
        <kbd className="rounded-md border border-border/70 bg-muted px-2 py-0.5 text-[10px] text-foreground/60">
          ⌘K
        </kbd>
      </button>

      <button
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 text-foreground/60 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput value={query} onValueChange={(value) => setQuery(value ? value : null)} placeholder="Search pages, concepts, or keywords..." />
          <CommandList>
            <CommandEmpty>No matches found.</CommandEmpty>
            <CommandGroup heading="Documents">
              {results.map((doc) => (
                <CommandItem key={doc.id} onSelect={() => handleSelect(doc.href)}>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{doc.title}</span>
                    <span className="text-xs text-foreground/60">{doc.description}</span>
                  </div>
                  <span className={cn('ml-auto text-xs uppercase tracking-wide text-foreground/50')}>
                    {doc.keywords[0]}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}

