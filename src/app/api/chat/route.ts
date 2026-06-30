import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { getAiConfig } from '@/data/docs'
import { siteConfig } from '@/data/site'
import { getRelevantChunks } from '@/lib/embeddings'
import type { RetrievalResult } from '@/lib/embeddings'

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
// Retrieval-augmented context
// ---------------------------------------------------------------------------

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
// Token budget for retrieved context — far smaller than the legacy raw dump.
const CONTEXT_TOKEN_BUDGET = 2200
const MAX_CHUNKS = 8

interface Citation {
  index: number
  title: string
  heading: string
  url: string
}

function sourceUrl(result: RetrievalResult): string {
  const { href, anchor } = result.chunk
  return anchor ? `${baseUrl}${href}#${anchor}` : `${baseUrl}${href}`
}

function buildRetrievedContext(results: Array<RetrievalResult>): { context: string; citations: Array<Citation> } {
  const citations: Array<Citation> = []
  const blocks: Array<string> = []

  results.forEach((result, i) => {
    const index = i + 1
    const heading = result.chunk.headingPath.join(' > ') || result.chunk.title
    citations.push({ index, title: result.chunk.title, heading, url: sourceUrl(result) })
    blocks.push(`[${index}] ${heading}\n${result.chunk.text}`)
  })

  return { context: blocks.join('\n\n---\n\n'), citations }
}

function latestUserQuery(messages: Array<{ role: string; content: string }>): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user' && messages[i].content.trim()) return messages[i].content.trim()
  }
  return ''
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

  // Retrieval-augmented context: embed the query and pull only the most
  // relevant chunks within a token budget (vs dumping the whole corpus).
  const query = latestUserQuery(messages)
  const results = await getRelevantChunks(query, { k: MAX_CHUNKS, tokenBudget: CONTEXT_TOKEN_BUDGET })
  const { context, citations } = buildRetrievedContext(results)

  const persona = (getAiConfig() as { systemPrompt?: string }).systemPrompt?.trim()
  const sourceList = citations
    .map((citation) => `[${citation.index}] ${citation.heading} — ${citation.url}`)
    .join('\n')

  const system = `You are a helpful documentation assistant for ${siteConfig.name}.
Answer questions based ONLY on the documentation excerpts provided below.
If the answer isn't in the excerpts, say so clearly — don't guess.
Cite the excerpts you use inline with their bracketed numbers, e.g. [1], [2].
Keep answers concise. Use markdown formatting where helpful.${persona ? `\n\nAdditional instructions:\n${persona}` : ''}

${context ? `Documentation excerpts:\n${context}\n\nSources:\n${sourceList}` : 'No relevant documentation excerpts were found for this question.'}`

  const client = new Anthropic({ apiKey })

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        // Append the cited sources so every answer is traceable to pages.
        if (citations.length > 0) {
          const footer = `\n\n---\nSources:\n${citations
            .map((citation) => `${citation.index}. [${citation.title}](${citation.url})`)
            .join('\n')}\n`
          controller.enqueue(encoder.encode(footer))
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
