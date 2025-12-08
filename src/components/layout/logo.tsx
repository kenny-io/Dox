import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]',
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-accent" />
      Dox
    </div>
  )
}

