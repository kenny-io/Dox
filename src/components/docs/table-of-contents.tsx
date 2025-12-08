'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'
import { layout, typography } from '@/config/layout'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

export function TableOfContents() {
  const pathname = usePathname()
  const [items, setItems] = useState<Array<TocItem>>([])
  const [activeId, setActiveId] = useState<string>()

  useEffect(() => {
    const headingElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-heading]'),
    ).map((element) => ({
      id: element.id,
      text: element.dataset.heading ?? element.textContent ?? '',
      level: Number(element.dataset.level ?? 2),
    }))
    startTransition(() => setItems(headingElements))
  }, [pathname])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -70% 0px' },
    )

    const elements = document.querySelectorAll<HTMLElement>('[data-heading]')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <aside className={cn('sticky top-32 text-sm', layout.tocWidth, layout.panel, 'p-5')}>
      <p className={cn('mb-4', typography.meta)}>On this page</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className={cn(item.level > 2 && 'pl-4')}>
            <Link
              href={`#${item.id}`}
              className={cn(
                'inline-flex w-full items-center gap-2 text-left text-sm text-foreground/60 transition hover:text-foreground',
                activeId === item.id && 'font-medium text-foreground',
              )}
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}

