import type { Context } from '@netlify/functions'

const CANNED = `# Task: Fix broken checkout total

## Summary
On the checkout page, the order total stays at **$0.00** after a valid cart is loaded. The Pay button remains enabled, so a customer can submit a zero-dollar order.

## Repro
1. Add any item to the cart and open Checkout.
2. Confirm line items render (e.g. Widget Pro $48.00).
3. Observe **Order total** still shows \`$0.00\` (mark ✎①).
4. Click **Pay now** — the form accepts the zero total (mark ✎②).

## Expected
Order total equals the sum of line items (plus tax/shipping when applicable). Pay should be disabled or blocked when the total is invalid.

## Suspected area
Checkout summary / totals reducer — likely not reading cart line prices when hydrating the summary panel.

## Acceptance
- Total matches cart subtotal for 1+ items.
- Pay is blocked when total is $0 with a non-empty cart.
- Add a regression test for the totals derivation.
`

interface Body {
  summaryMd?: string
  title?: string
  isSample?: boolean
  scrawlJson?: unknown
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

async function rewriteWithOpenAI(summaryMd: string, title: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Rewrite the scrawl bug report into a crisp engineering task with Summary, Repro, Expected, Suspected area, and Acceptance. Markdown only.',
        },
        {
          role: 'user',
          content: `Title: ${title}\n\n${summaryMd}`,
        },
      ],
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() ?? null
}

async function rewriteWithAnthropic(summaryMd: string, title: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `Rewrite this scrawl bug report into a crisp engineering task with Summary, Repro, Expected, Suspected area, and Acceptance. Markdown only.\n\nTitle: ${title}\n\n${summaryMd}`,
        },
      ],
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
  }
  const text = data.content?.find((c) => c.type === 'text')?.text
  return text?.trim() ?? null
}

export default async (req: Request, _context: Context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405)
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    body = {}
  }

  const summaryMd = body.summaryMd ?? ''
  const title = body.title ?? 'Scrawl report'

  if (body.isSample || (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY)) {
    return json({
      source: 'canned',
      task: body.isSample
        ? CANNED
        : [
            `# Task: ${title}`,
            '',
            '## Summary',
            summaryMd.slice(0, 2500) || '_No summary provided_',
            '',
            '## Acceptance',
            '- Reproduce using contact-sheet.png and frames/.',
            '- Fix the marked behavior and add a regression test.',
            '',
            '_Canned fallback — set OPENAI_API_KEY or ANTHROPIC_API_KEY on Netlify for LLM rewrite._',
          ].join('\n'),
    })
  }

  try {
    const llm =
      (await rewriteWithOpenAI(summaryMd, title)) ??
      (await rewriteWithAnthropic(summaryMd, title))
    if (llm) return json({ source: 'llm', task: llm })
  } catch {
    /* fall through */
  }

  return json({ source: 'canned', task: CANNED })
}
