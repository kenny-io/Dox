import Link from 'next/link'
import { siteConfig } from '@/data/site'

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="flex flex-col gap-3 px-4 py-6 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Built for independent teams.</p>
        <div className="flex gap-4">
          {siteConfig.links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}

