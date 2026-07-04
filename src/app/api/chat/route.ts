import Anthropic from '@anthropic-ai/sdk'
import { type NextRequest } from 'next/server'
import { trackAnalyticsEvent } from '@/lib/analytics/store'
import { getAiConfig } from '@/data/docs'
import { siteConfig } from '@/data/site'
import { getRelevantChunks } from '@/lib/embeddings'
import { recordChatInsight, WEAK_SCORE } from '@/lib/chat-insights'
import { getSiteUrl } from '@/lib/site-url'
import { resolveChatKey, checkChatRateLimit } from '@/lib/ai/chat-access'
import type { RetrievalResult } from '@/lib/embeddings'

// ---------------------------------------------------------------------------
// Retrieval-augmented context
// ---------------------------------------------------------------------------

const baseUrl = getSiteUrl()
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

  // Resolve the active key tier: the owner's own key (generous limits) or the
  // shared trial key that powers the out-of-the-box "aha" experience.
  const resolved = await resolveChatKey()
  if (!resolved) {
    return new Response(
      'AI chat needs an Anthropic key. Set ANTHROPIC_API_KEY (your own key) to enable it.',
      { status: 503 },
    )
  }
  const { apiKey, tier } = resolved

  // Tier-aware rate limiting (trial keys are tightly capped).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const decision = checkChatRateLimit(ip, tier)
  if (decision.limited) {
    const message =
      decision.reason === 'global_daily'
        ? 'The shared trial key has reached its daily limit. Add your own ANTHROPIC_API_KEY for unlimited use.'
        : tier === 'trial'
          ? 'Trial rate limit reached. Add your own ANTHROPIC_API_KEY to lift these limits.'
          : 'Rate limit exceeded. Please wait a moment before asking again.'
    return new Response(message, {
      status: 429,
      headers: {
        'x-dox-ai-tier': tier,
        ...(decision.retryAfter ? { 'Retry-After': String(decision.retryAfter) } : {}),
      },
    })
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

  try {
    await trackAnalyticsEvent({
      type: 'chat_message',
      path: '/api/chat',
      visitorType: 'human',
    })
  } catch (error) {
    // Analytics is best-effort — never block a chat response on a write.
    console.error('chat: failed to record analytics event', error)
  }

  // Retrieval-augmented context: embed the query and pull only the most
  // relevant chunks within a token budget (vs dumping the whole corpus).
  const query = latestUserQuery(messages)
  const results = await getRelevantChunks(query, { k: MAX_CHUNKS, tokenBudget: CONTEXT_TOKEN_BUDGET })
  const { context, citations } = buildRetrievedContext(results)

  // Record the exchange for insights (best-effort, opt-out via DOX_CHAT_INSIGHTS=off).
  const topScore = results[0]?.score ?? 0
  recordChatInsight({
    question: query.slice(0, 500),
    chunkCount: results.length,
    topScore,
    slugs: citations.map((c) => c.url).slice(0, 5),
    tier,
    weak: results.length === 0 || topScore < WEAK_SCORE,
  })

  const persona = aiConfig.systemPrompt?.trim()
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
      'x-dox-ai-tier': tier,
    },
  })
}
