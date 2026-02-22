import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'
import matter from 'gray-matter'
import { readDocsJson, writeDocsJson } from './docs-json.js'
import type { DocsJsonNavigationGroup } from './docs-json.js'

interface LintIssue {
  severity: 'error' | 'warning'
  message: string
  file?: string
}

function collectNavPageIds(
  groups: Array<string | DocsJsonNavigationGroup>,
  seen: Set<string>,
  duplicates: Set<string>,
): void {
  for (const page of groups) {
    if (typeof page === 'string') {
      if (seen.has(page)) {
        duplicates.add(page)
      } else {
        seen.add(page)
      }
    } else if (page.pages) {
      collectNavPageIds(page.pages, seen, duplicates)
    }
  }
}

function scanMdx(dir: string, results: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    try {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        scanMdx(fullPath, results)
      } else if (extname(entry).toLowerCase() === '.mdx') {
        results.push(fullPath)
      }
    } catch {
      // skip
    }
  }
}

function addOrphanToNav(projectDir: string, pageId: string): void {
  const config = readDocsJson(projectDir)
  const tab = config.tabs.find((t) => !t.href && !t.api && t.groups && t.groups.length > 0)
  if (!tab?.groups) return
  const lastGroup = tab.groups[tab.groups.length - 1]
  const existing = lastGroup.pages.filter((p): p is string => typeof p === 'string')
  if (!existing.includes(pageId)) {
    lastGroup.pages.push(pageId)
    writeDocsJson(projectDir, config)
  }
}

export async function runCheck(projectDir: string, fix: boolean): Promise<number> {
  if (!existsSync(join(projectDir, 'docs.json'))) {
    console.error(`\n  ❌ Not a Dox project: docs.json not found in ${projectDir}\n`)
    return 1
  }

  const contentDir = join(projectDir, 'src', 'content')
  const issues: LintIssue[] = []
  const config = readDocsJson(projectDir)

  // Collect nav page IDs + detect duplicates
  const navPageIds = new Set<string>()
  const duplicates = new Set<string>()

  for (const tab of config.tabs) {
    if (tab.href || tab.api) continue
    if (!tab.groups || tab.groups.length === 0) {
      issues.push({ severity: 'error', message: `Tab "${tab.tab}" has no groups and no href — it will render empty` })
      continue
    }
    collectNavPageIds(tab.groups.map((g) => g as unknown as string | DocsJsonNavigationGroup), navPageIds, duplicates)
  }

  for (const dup of duplicates) {
    issues.push({ severity: 'error', message: `[duplicate] "${dup}" appears more than once in docs.json` })
  }

  // Check: page in nav but no MDX file
  for (const pageId of navPageIds) {
    const candidates = [
      join(contentDir, `${pageId}.mdx`),
      join(contentDir, `${pageId}/index.mdx`),
    ]
    if (!candidates.some((c) => existsSync(c))) {
      issues.push({
        severity: 'error',
        message: `"${pageId}" is in docs.json but has no MDX file`,
        file: `src/content/${pageId}.mdx`,
      })
    }
  }

  // Scan all MDX files
  const allFiles: string[] = []
  if (existsSync(contentDir)) scanMdx(contentDir, allFiles)

  const fixedOrphans: string[] = []

  for (const filePath of allFiles) {
    const rel = filePath.slice(contentDir.length + 1).replace(/\.mdx$/, '').replace(/\\/g, '/')
    const pageId = rel.endsWith('/index') ? rel.slice(0, -6) : rel

    if (!navPageIds.has(pageId)) {
      if (fix) {
        addOrphanToNav(projectDir, pageId)
        fixedOrphans.push(pageId)
      } else {
        issues.push({
          severity: 'warning',
          message: `"${pageId}" is not in docs.json nav (orphan)`,
          file: relative(projectDir, filePath),
        })
      }
    }

    let data: Record<string, unknown> = {}
    let content = ''
    try {
      const raw = readFileSync(filePath, 'utf8')
      const parsed = matter(raw)
      data = parsed.data
      content = parsed.content
    } catch {
      issues.push({ severity: 'error', message: `Could not parse frontmatter`, file: relative(projectDir, filePath) })
      continue
    }

    const rel2 = relative(projectDir, filePath)
    if (!data.title) {
      issues.push({ severity: 'warning', message: `Missing "title" in frontmatter`, file: rel2 })
    }
    if (!data.description) {
      issues.push({ severity: 'warning', message: `Missing "description" in frontmatter`, file: rel2 })
    }
    if (content.trim().length < 50) {
      issues.push({ severity: 'warning', message: `Very short body (${content.trim().length} chars) — page may be empty`, file: rel2 })
    }
  }

  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  console.log(`\n  Linting ${projectDir}...\n`)

  if (errors.length === 0 && warnings.length === 0 && fixedOrphans.length === 0) {
    console.log('  ✅ No issues found.\n')
    return 0
  }

  console.log(`  ❌ ${errors.length} error${errors.length !== 1 ? 's' : ''}, ⚠️  ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}\n`)

  if (errors.length > 0) {
    console.log('  ERRORS:')
    for (const issue of errors) {
      console.log(`    ${issue.message}`)
      if (issue.file) console.log(`    → ${issue.file}`)
    }
    console.log('')
  }

  if (warnings.length > 0) {
    console.log('  WARNINGS:')
    for (const issue of warnings) {
      console.log(`    ${issue.message}`)
      if (issue.file) console.log(`    → ${issue.file}`)
    }
    console.log('')
  }

  if (fixedOrphans.length > 0) {
    console.log(`  ✅ Auto-fixed ${fixedOrphans.length} orphan page${fixedOrphans.length > 1 ? 's' : ''} (added to nav):`)
    for (const p of fixedOrphans) console.log(`    + ${p}`)
    console.log('')
  }

  if (!fix && warnings.some((w) => w.message.includes('orphan'))) {
    console.log('  Tip: run with --fix to auto-add orphan pages to navigation.\n')
  }

  return errors.length > 0 ? 1 : 0
}
