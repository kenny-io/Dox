import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { getAiConfig } from '@/data/docs'
import { siteConfig } from '@/data/site'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { getDocEntries, getSidebarCollections } from '@/data/docs'

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: 10 req/min per IP
// ---------------------------------------------------------------------------

interface RateEntry { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateEntry>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  if (entry.count >= 10) return true
  entry.count++
  return false
}

// ---------------------------------------------------------------------------
// Build docs context (reuses llms-full.txt logic)
// ---------------------------------------------------------------------------

const CONTENT_ROOT = path.join(process.cwd(), 'src/content')
const CHAR_LIMIT = 80_000

function readPageContent(pageId: string): string | null {
  const candidates = [
    path.join(CONTENT_ROOT, `${pageId}.mdx`),
    path.join(CONTENT_ROOT, `${pageId}/index.mdx`),
  ]
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8')
      const { content } = matter(raw)
      return content
        .replace(/<\/?(?:Steps|Step|Tabs|Tab|Note|Callout|CodeGroup|CardGroup|Card|Frame|Accordion|Columns|Tooltip)[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }
  }
  return null
}

function buildDocsContext(): string {
  const entries = getDocEntries()
  const collections = getSidebarCollections()
  const parts: string[] = []
  let totalChars = 0

  for (const collection of collections) {
    if (collection.href || collection.api) continue
    for (const section of collection.sections) {
      for (const item of section.items) {
        const entry = entries.find((e) => e.href === item.href)
        if (!entry) continue
        const content = readPageContent(entry.id)
        if (!content) continue

        const block = `# ${entry.title}\n${entry.description ? `> ${entry.description}\n` : ''}\n${content}\n`
        if (totalChars + block.length > CHAR_LIMIT) break
        parts.push(block)
        totalChars += block.length
      }
    }
  }

  return parts.join('\n---\n\n')
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const aiConfig = getAiConfig()
  if (!aiConfig.chat) {
    return new Response('AI chat is not enabled for this project.', { status: 403 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY is not configured.', { status: 503 })
  }

  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return new Response('Rate limit exceeded. Please wait a moment before asking again.', { status: 429 })
  }

  let messages: Array<{ role: 'user' | 'assistant'; content: string }>
  try {
    const body = await request.json() as { messages?: unknown }
    if (!Array.isArray(body.messages)) throw new Error('invalid')
    messages = body.messages as Array<{ role: 'user' | 'assistant'; content: string }>
  } catch {
    return new Response('Invalid request body. Expected { messages: [...] }', { status: 400 })
  }

  if (messages.length === 0) {
    return new Response('No messages provided.', { status: 400 })
  }

  const docsContext = buildDocsContext()

  const client = new Anthropic({ apiKey })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `You are a helpful documentation assistant for ${siteConfig.name}.
Answer questions based ONLY on the documentation provided below.
If the answer isn't in the docs, say so clearly — don't guess.
Keep answers concise. Use markdown formatting where helpful.

Documentation:
${docsContext}`,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-store',
    },
  })
}
