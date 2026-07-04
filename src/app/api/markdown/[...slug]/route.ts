import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { stripInternalFrontmatter } from '@/lib/provenance'

const localDocsRoot = path.join(process.cwd(), 'src/content')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params
  const slugPath = slug.join('/')

  const candidates = [
    path.join(localDocsRoot, `${slugPath}.mdx`),
    path.join(localDocsRoot, `${slugPath}.md`),
    path.join(localDocsRoot, `${slugPath}/index.mdx`),
  ]

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, 'utf8')
      // Strip internal provenance frontmatter so it never ships publicly.
      return new NextResponse(stripInternalFrontmatter(raw), {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      })
    } catch {
      // file not found — try next candidate
    }
  }

  return new NextResponse('Not Found', { status: 404 })
}
