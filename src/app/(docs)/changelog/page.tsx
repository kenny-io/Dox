import { DocLayout } from '@/components/docs/doc-layout'
import type { DocEntry } from '@/data/docs'

const Placeholder = () => null

const doc: DocEntry = {
  id: 'changelog',
  title: 'Changelog',
  description: 'Track notable improvements to the Dox template.',
  slug: ['changelog'],
  href: '/changelog',
  group: 'Updates',
  keywords: ['changelog'],
  component: Placeholder,
  timeEstimate: '2 min',
  lastUpdated: new Date().toISOString().slice(0, 10),
}

export const metadata = {
  title: doc.title,
  description: doc.description,
}

export default function ChangelogPage() {

  return (
    <DocLayout doc={doc}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">v0.1.0</h2>
          <p className="text-sm text-foreground/60">Initial release of the clean-room Dox template.</p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-foreground/80">
            <li>Next.js App Router foundation with MDX-powered docs</li>
            <li>Responsive shell with Radix-driven navigation and search</li>
            <li>Shadcn-inspired primitives for buttons, badges, and command palette</li>
          </ul>
        </div>
      </div>
    </DocLayout>
  )
}

