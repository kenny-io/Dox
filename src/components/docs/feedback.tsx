'use client'

import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MutedPanel, Panel } from '@/components/layout/sections'

export function Feedback() {
  const [state, setState] = useState<'idle' | 'recorded'>('idle')

  if (state === 'recorded') {
    return (
      <MutedPanel className="text-sm text-foreground/80">
        Thanks for the signal — we review every submission weekly.
      </MutedPanel>
    )
  }

  return (
    <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-foreground/80">Was this page helpful?</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setState('recorded')}>
          <Check className="mr-2 h-4 w-4" />
          Yes
        </Button>
        <Button variant="outline" onClick={() => setState('recorded')}>
          <X className="mr-2 h-4 w-4" />
          No
        </Button>
      </div>
    </Panel>
  )
}

