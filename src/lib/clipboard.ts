import type { ScrawlBundle } from '../types'
import { agentPromptFromBundle, CANNED_TASK_SPEC } from './bundle'

export async function copyForAgent(bundle: ScrawlBundle): Promise<{ ok: boolean; detail: string }> {
  const text = agentPromptFromBundle(bundle)

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
      const png = bundle.contactSheetPng
      const item = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'image/png': png,
      })
      await navigator.clipboard.write([item])
      return { ok: true, detail: 'Copied markdown + contact sheet image to clipboard.' }
    }
  } catch {
    // Fall through to text-only
  }

  try {
    await navigator.clipboard.writeText(text)
    return {
      ok: true,
      detail: 'Copied agent prompt (text). Image copy is unavailable in this browser — download the zip for the contact sheet.',
    }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'Clipboard write failed',
    }
  }
}

export async function turnIntoTask(
  bundle: ScrawlBundle,
): Promise<{ source: 'llm' | 'canned'; task: string }> {
  try {
    const res = await fetch('/.netlify/functions/turn-into-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summaryMd: bundle.summaryMd,
        title: bundle.scrawlJson.title,
        scrawlJson: bundle.scrawlJson,
        isSample: bundle.isSample === true,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { source?: 'llm' | 'canned'; task?: string }
    if (!data.task) throw new Error('Empty task')
    return { source: data.source ?? 'canned', task: data.task }
  } catch {
    // Client-side canned fallback when function is unreachable (local static serve)
    if (bundle.isSample) {
      return { source: 'canned', task: CANNED_TASK_SPEC }
    }
    const marks = bundle.marks
      .map((m) => `- ${m.label}: ${m.note ?? m.kind} @ ${Math.round(m.nx * 100)}%,${Math.round(m.ny * 100)}%`)
      .join('\n')
    return {
      source: 'canned',
      task: [
        `# Task: Investigate scrawl report`,
        '',
        `## Summary`,
        bundle.scrawlJson.title,
        '',
        '## Marks',
        marks || '_No marks_',
        '',
        '## Transcript excerpt',
        bundle.transcript.map((t) => `- ${t.text}`).join('\n') || '_None_',
        '',
        '## Acceptance',
        '- Reproduce from contact-sheet.png and frames/.',
        '- Fix the marked UI behavior and add a regression test.',
        '',
        '_Generated locally — set OPENAI_API_KEY or ANTHROPIC_API_KEY on Netlify for LLM rewrite._',
      ].join('\n'),
    }
  }
}
