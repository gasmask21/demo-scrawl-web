import JSZip from 'jszip'
import type {
  FrameAsset,
  Mark,
  ScrawlBundle,
  ScrawlDocument,
  TranscriptChunk,
} from '../types'
import { buildContactSheet } from './contactSheet'
import { formatMsPrecise } from './format'

function buildTimeline(
  marks: Mark[],
  transcript: TranscriptChunk[],
  frames: FrameAsset[],
): ScrawlDocument['timeline'] {
  const events: ScrawlDocument['timeline'] = []

  for (const mark of marks) {
    events.push({
      tMs: mark.tMs,
      type: mark.kind === 'click' ? 'click' : 'mark',
      label: `${mark.label} ${mark.kind} at (${Math.round(mark.nx * 100)}%, ${Math.round(mark.ny * 100)}%)`,
      markId: mark.id,
    })
  }
  for (const chunk of transcript) {
    events.push({
      tMs: chunk.tMs,
      type: 'speech',
      label: chunk.text,
    })
  }
  for (const frame of frames) {
    if (frame.markId == null) {
      events.push({
        tMs: frame.tMs,
        type: 'keyframe',
        label: `Keyframe ${frame.id}`,
      })
    }
  }

  return events.sort((a, b) => a.tMs - b.tMs)
}

export function buildSummaryMd(
  title: string,
  durationMs: number,
  marks: Mark[],
  transcript: TranscriptChunk[],
  frames: FrameAsset[],
): string {
  const lines: string[] = [
    `# Scrawl: ${title}`,
    '',
    `Duration: ${formatMsPrecise(durationMs)} · Marks: ${marks.length} · Frames: ${frames.length}`,
    '',
    '## What to fix',
    '',
    'Use the numbered marks on `contact-sheet.png` and the frames in `frames/` to locate the UI under discussion. Prefer visual evidence over guessing.',
    '',
    '## Time-aligned transcript',
    '',
  ]

  if (transcript.length === 0) {
    lines.push('_No speech captured. Marks and clicks are still authoritative._', '')
  } else {
    for (const chunk of transcript) {
      lines.push(`- **[${formatMsPrecise(chunk.tMs)}]** ${chunk.text}`)
    }
    lines.push('')
  }

  lines.push('## Interaction timeline', '')
  for (const mark of marks) {
    lines.push(
      `- **[${formatMsPrecise(mark.tMs)}]** ${mark.label} · ${mark.kind} · (${(mark.nx * 100).toFixed(1)}%, ${(mark.ny * 100).toFixed(1)}%)${mark.note ? ` — ${mark.note}` : ''}`,
    )
  }
  if (marks.length === 0) {
    lines.push('_No marks placed._')
  }
  lines.push('')
  lines.push('## Agent instructions', '')
  lines.push('1. Open `contact-sheet.png` and inspect each numbered annotation.')
  lines.push('2. Cross-check `frames/` for the exact pixels at each mark.')
  lines.push('3. Read `scrawl.json` for structured timestamps and coordinates.')
  lines.push('4. Reproduce the bug from the transcript + marks, then propose a fix.')
  lines.push('')

  return lines.join('\n')
}

export function buildScrawlJson(
  title: string,
  createdAt: string,
  durationMs: number,
  marks: Mark[],
  transcript: TranscriptChunk[],
  frames: FrameAsset[],
): ScrawlDocument {
  return {
    version: 1,
    app: 'scrawl-web',
    createdAt,
    durationMs,
    title,
    marks: marks.map((m) => ({
      id: m.id,
      kind: m.kind,
      tMs: m.tMs,
      label: m.label,
      x: m.x,
      y: m.y,
      nx: m.nx,
      ny: m.ny,
      radius: m.radius,
      note: m.note,
    })),
    transcript: transcript.map((c) => ({ tMs: c.tMs, text: c.text })),
    timeline: buildTimeline(marks, transcript, frames),
    frames: frames.map((f, i) => ({
      file: `frames/frame-${String(i + 1).padStart(2, '0')}.jpg`,
      tMs: f.tMs,
      markId: f.markId,
    })),
    contactSheet: 'contact-sheet.png',
  }
}

export async function assembleBundle(input: {
  title: string
  startedAt: string
  durationMs: number
  marks: Mark[]
  transcript: TranscriptChunk[]
  frames: FrameAsset[]
  isSample?: boolean
}): Promise<ScrawlBundle> {
  const sheet = await buildContactSheet(input.frames, input.marks, input.title)
  const summaryMd = buildSummaryMd(
    input.title,
    input.durationMs,
    input.marks,
    input.transcript,
    input.frames,
  )
  const scrawlJson = buildScrawlJson(
    input.title,
    input.startedAt,
    input.durationMs,
    input.marks,
    input.transcript,
    input.frames,
  )

  return {
    startedAt: input.startedAt,
    durationMs: input.durationMs,
    marks: input.marks,
    transcript: input.transcript,
    frames: input.frames,
    contactSheetPng: sheet.blob,
    contactSheetUrl: sheet.dataUrl,
    summaryMd,
    scrawlJson,
    isSample: input.isSample,
  }
}

export async function zipBundle(bundle: ScrawlBundle): Promise<Blob> {
  const zip = new JSZip()
  zip.file('contact-sheet.png', bundle.contactSheetPng)
  zip.file('summary.md', bundle.summaryMd)
  zip.file('scrawl.json', JSON.stringify(bundle.scrawlJson, null, 2))

  const folder = zip.folder('frames')
  if (!folder) throw new Error('Could not create frames folder')

  await Promise.all(
    bundle.frames.map(async (frame, i) => {
      const name = `frame-${String(i + 1).padStart(2, '0')}.jpg`
      folder.file(name, frame.blob)
    }),
  )

  return zip.generateAsync({ type: 'blob' })
}

export function agentPromptFromBundle(bundle: ScrawlBundle): string {
  return [
    'I recorded a Scrawl bug report. Please fix the issue using the visual marks and transcript below.',
    '',
    'The zip / attached assets include:',
    '- contact-sheet.png — annotated keyframes',
    '- frames/ — individual captures at each mark',
    '- summary.md — time-aligned transcript + timeline',
    '- scrawl.json — structured coordinates and events',
    '',
    '---',
    '',
    bundle.summaryMd,
    '',
    '---',
    '',
    '```json',
    JSON.stringify(bundle.scrawlJson, null, 2),
    '```',
  ].join('\n')
}

export const CANNED_TASK_SPEC = `# Task: Fix broken checkout total

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
