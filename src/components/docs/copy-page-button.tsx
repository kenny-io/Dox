'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CopyPageButton() {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      // The root path (/) maps to introduction.mdx
      const markdownPath = pathname === '/' ? '/introduction.md' : `${pathname}.md`
      const res = await fetch(markdownPath)
      if (!res.ok) return
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access unavailable (e.g. non-secure context) — fail silently
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      aria-label="Copy page as markdown"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? 'Copied!' : 'Copy page'}
    </Button>
  )
}
