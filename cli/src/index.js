#!/usr/bin/env node

// create-dox — Scaffold a new Dox documentation project.
// Zero dependencies. Requires Node >= 18.

import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

// ── Constants ────────────────────────────────────────────────────────────────

const REPO_URL = 'https://github.com/kenny-io/Dox.git'
const BRAND_PRESETS = ['primary', 'secondary']
const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('-'))
const positional = args.filter((a) => !a.startsWith('-'))
const useDefaults = flags.includes('--yes') || flags.includes('-y')

const STARTER_PAGES = {
  'introduction.mdx': `---
title: Introduction
description: Welcome to {NAME} documentation.
---

## Welcome

This is the home page of your **{NAME}** documentation site, powered by [Dox](https://github.com/kenny-io/Dox).

Get started by editing this file at \`src/content/introduction.mdx\`.
`,
  'quickstart.mdx': `---
title: Quickstart
description: Get up and running with {NAME} in under 5 minutes.
---

## Installation

\`\`\`bash
npm install {SLUG}
\`\`\`

## Basic usage

\`\`\`ts
import { create } from '{SLUG}'

const client = create({ apiKey: 'your-api-key' })
\`\`\`

That's it — you're ready to go!
`,
}

const STARTER_DOCS_JSON = `{
  "tabs": [
    {
      "tab": "Overview",
      "groups": [
        {
          "group": "Getting Started",
          "pages": ["introduction", "quickstart"]
        }
      ]
    },
    {
      "tab": "Changelog",
      "href": "/changelog"
    }
  ]
}
`

// ── Helpers ──────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(question, fallback) {
  return new Promise((resolve) => {
    const suffix = fallback ? ` (${fallback})` : ''
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || fallback || '')
    })
  })
}

function choose(question, options, fallback) {
  return new Promise((resolve) => {
    const optionList = options.map((o, i) => `  ${i + 1}) ${o}`).join('\n')
    const defaultIndex = options.indexOf(fallback) + 1
    const suffix = defaultIndex ? ` [${defaultIndex}]` : ''
    rl.question(`${question}\n${optionList}\n> Choose${suffix}: `, (answer) => {
      const num = parseInt(answer.trim(), 10)
      if (num >= 1 && num <= options.length) {
        resolve(options[num - 1])
      } else {
        resolve(fallback || options[0])
      }
    })
  })
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function runSilent(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf8' }).trim()
}

function logo() {
  console.log('')
  console.log('  ╔══════════════════════════════════════╗')
  console.log('  ║                                      ║')
  console.log('  ║       ██████╗  ██████╗ ██╗  ██╗      ║')
  console.log('  ║       ██╔══██╗██╔═══██╗╚██╗██╔╝      ║')
  console.log('  ║       ██║  ██║██║   ██║ ╚███╔╝       ║')
  console.log('  ║       ██║  ██║██║   ██║ ██╔██╗       ║')
  console.log('  ║       ██████╔╝╚██████╔╝██╔╝ ██╗      ║')
  console.log('  ║       ╚═════╝  ╚═════╝ ╚═╝  ╚═╝      ║')
  console.log('  ║                                      ║')
  console.log('  ║   Beautiful docs, zero lock-in.      ║')
  console.log('  ║                                      ║')
  console.log('  ╚══════════════════════════════════════╝')
  console.log('')
}

function success(projectDir, projectName) {
  console.log('')
  console.log('  ✅ Your Dox project is ready!')
  console.log('')
  console.log(`  📂 ${projectDir}`)
  console.log('')
  console.log('  Next steps:')
  console.log('')
  console.log(`    cd ${basename(projectDir)}`)
  console.log('    npm run dev')
  console.log('')
  console.log(`  Then open http://localhost:3040 to see your ${projectName} docs.`)
  console.log('')
  console.log('  📝 Key files to edit:')
  console.log('    • src/data/site.ts        — name, links, branding')
  console.log('    • docs.json               — navigation structure')
  console.log('    • src/content/*.mdx        — your documentation')
  console.log('    • openapi.yaml            — API spec (optional)')
  console.log('')
  console.log('  Happy documenting! 🚀')
  console.log('')
}

// ── Scaffold logic ───────────────────────────────────────────────────────────

function cloneTemplate(targetDir) {
  console.log('')
  console.log('  ⏳ Cloning Dox template...')
  run(`git clone --depth 1 ${REPO_URL} "${targetDir}"`)

  // Remove the template's .git so the user starts fresh
  const gitDir = join(targetDir, '.git')
  if (existsSync(gitDir)) {
    execSync(`rm -rf "${gitDir}"`)
  }

  // Remove the CLI folder from the cloned project (they don't need it)
  const cliDir = join(targetDir, 'cli')
  if (existsSync(cliDir)) {
    execSync(`rm -rf "${cliDir}"`)
  }
}

function writeStarterContent(targetDir, projectName, slug) {
  const contentDir = join(targetDir, 'src', 'content')

  // Clear existing example content
  if (existsSync(contentDir)) {
    const entries = readdirSync(contentDir)
    for (const entry of entries) {
      const fullPath = join(contentDir, entry)
      execSync(`rm -rf "${fullPath}"`)
    }
  } else {
    mkdirSync(contentDir, { recursive: true })
  }

  // Write starter pages
  for (const [filename, template] of Object.entries(STARTER_PAGES)) {
    const content = template
      .replace(/\{NAME\}/g, projectName)
      .replace(/\{SLUG\}/g, slug)
    writeFileSync(join(contentDir, filename), content, 'utf8')
  }

  // Write docs.json
  writeFileSync(join(targetDir, 'docs.json'), STARTER_DOCS_JSON, 'utf8')
}

function updateSiteConfig(targetDir, projectName, description, brandPreset, repoUrl) {
  const siteFile = join(targetDir, 'src', 'data', 'site.ts')
  if (!existsSync(siteFile)) {
    console.log('  ⚠️  Could not find src/data/site.ts — skipping config update.')
    return
  }

  let source = readFileSync(siteFile, 'utf8')

  // Replace name
  source = source.replace(
    /name:\s*'[^']*'/,
    `name: '${projectName.replace(/'/g, "\\'")}'`,
  )

  // Replace description (handles multiline template string)
  source = source.replace(
    /description:[\s\S]*?'([^']*)'/,
    `description:\n    '${description.replace(/'/g, "\\'")}'`,
  )

  // Replace brand preset
  source = source.replace(
    /const brandPreset:\s*BrandPresetKey\s*=\s*'[^']*'/,
    `const brandPreset: BrandPresetKey = '${brandPreset}'`,
  )

  // Replace repo URL
  if (repoUrl) {
    source = source.replace(
      /repoUrl:\s*'[^']*'/,
      `repoUrl: '${repoUrl}'`,
    )
    // Also update GitHub link
    source = source.replace(
      /\{\s*label:\s*'GitHub',\s*href:\s*'[^']*'\s*\}/,
      `{ label: 'GitHub', href: '${repoUrl}' }`,
    )
    // Update support link
    source = source.replace(
      /\{\s*label:\s*'Support',\s*href:\s*'[^']*'\s*\}/,
      `{ label: 'Support', href: '${repoUrl}/issues/new' }`,
    )
  }

  writeFileSync(siteFile, source, 'utf8')
}

function updateEnvExample(targetDir) {
  const envFile = join(targetDir, '.env.example')
  if (existsSync(envFile)) {
    // Copy .env.example to .env.local for immediate use
    const envLocal = join(targetDir, '.env.local')
    if (!existsSync(envLocal)) {
      cpSync(envFile, envLocal)
    }
  }
}

function initGit(targetDir) {
  try {
    run('git init', targetDir)
    run('git add -A', targetDir)
    run('git commit -m "Initial commit from create-dox"', targetDir)
  } catch {
    // Git might not be configured — that's fine
    console.log('  ⚠️  Could not initialize git (you can do this manually).')
  }
}

function installDeps(targetDir) {
  console.log('')
  console.log('  📦 Installing dependencies...')
  console.log('')
  run('npm install', targetDir)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  logo()

  // 1. Project directory
  const dirArg = positional[0]
  let projectDir
  if (dirArg) {
    projectDir = resolve(dirArg)
  } else if (useDefaults) {
    projectDir = resolve('my-docs')
  } else {
    const dirName = await ask('  Project directory', 'my-docs')
    projectDir = resolve(dirName)
  }

  if (existsSync(projectDir) && readdirSync(projectDir).length > 0) {
    console.log(`\n  ❌ Directory "${projectDir}" already exists and is not empty.`)
    rl.close()
    process.exit(1)
  }

  // 2. Project name
  const defaultName = basename(projectDir)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  const projectName = useDefaults ? defaultName : await ask('  Project name', defaultName)

  // 3. Description
  const defaultDesc = `Documentation for ${projectName}.`
  const description = useDefaults ? defaultDesc : await ask('  Description', defaultDesc)

  // 4. Brand preset
  const brandPreset = useDefaults ? 'primary' : await choose('\n  Brand preset:', BRAND_PRESETS, 'primary')

  // 5. GitHub repo (optional)
  const repoUrl = useDefaults ? '' : await ask('  GitHub repo URL (optional)', '')

  // 6. Install deps?
  let doInstall = true
  if (!useDefaults) {
    const shouldInstall = await ask('  Install dependencies? (Y/n)', 'Y')
    doInstall = shouldInstall.toLowerCase() !== 'n'
  }

  const slug = slugify(projectName)

  // ── Execute ──────────────────────────────────────────────────────────────

  cloneTemplate(projectDir)
  writeStarterContent(projectDir, projectName, slug)
  updateSiteConfig(projectDir, projectName, description, brandPreset, repoUrl)
  updateEnvExample(projectDir)

  if (doInstall) {
    installDeps(projectDir)
  }

  initGit(projectDir)
  success(projectDir, projectName)

  rl.close()
}

main().catch((err) => {
  console.error('\n  ❌ Error:', err.message)
  rl.close()
  process.exit(1)
})
