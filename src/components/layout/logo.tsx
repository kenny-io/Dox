import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  showText?: boolean
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-accent"
      >
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path
          d="M9 11C9 9.89543 9.89543 9 11 9H14C17.3137 9 20 11.6863 20 15C20 18.3137 17.3137 21 14 21H11C9.89543 21 9 20.1046 9 19V11Z"
          className="fill-white"
        />
        <circle cx="22" cy="15" r="3" className="fill-white" />
      </svg>
      {showText ? (
        <span className="text-lg font-bold tracking-tight text-foreground">Dox</span>
      ) : null}
    </div>
  )
}

