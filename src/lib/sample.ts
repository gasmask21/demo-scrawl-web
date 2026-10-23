import type { FrameAsset, Mark, TranscriptChunk } from '../types'
import { assembleBundle } from './bundle'

function paintCheckoutFrame(
  label: string,
  highlight: { x: number; y: number; w: number; h: number; markLabel: string } | null,
  bugVisible: boolean,
): Promise<FrameAsset> {
  const width = 1280
  const height = 800
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  // Page chrome
  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#F4F7FB')
  bg.addColorStop(1, '#E4EBF5')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Top bar
  ctx.fillStyle = '#0B1220'
  ctx.fillRect(0, 0, width, 64)
  ctx.fillStyle = '#3DDC97'
  ctx.font = '700 22px Syne, system-ui, sans-serif'
  ctx.fillText('Shopwright', 28, 40)
  ctx.fillStyle = '#E8EEF7'
  ctx.font = '500 14px "IBM Plex Mono", monospace'
  ctx.fillText('Checkout', 180, 40)
  ctx.fillText('Cart (2)', width - 140, 40)

  // Main card
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(11, 18, 32, 0.12)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 8
  roundRect(ctx, 80, 120, 720, 520, 16)
  ctx.fill()
  ctx.shadowColor = 'transparent'

  ctx.fillStyle = '#0B1220'
  ctx.font = '700 28px Syne, system-ui, sans-serif'
  ctx.fillText('Checkout', 112, 170)
  ctx.font = '500 14px "IBM Plex Mono", monospace'
  ctx.fillStyle = '#5A6B84'
  ctx.fillText(label, 112, 196)

  // Line items
  const items = [
    { name: 'Widget Pro', price: '$48.00' },
    { name: 'Cable Kit', price: '$12.00' },
  ]
  items.forEach((item, i) => {
    const y = 240 + i * 72
    ctx.fillStyle = '#F0F4FA'
    roundRect(ctx, 112, y, 656, 56, 10)
    ctx.fill()
    ctx.fillStyle = '#0B1220'
    ctx.font = '600 16px Syne, system-ui, sans-serif'
    ctx.fillText(item.name, 136, y + 34)
    ctx.font = '500 16px "IBM Plex Mono", monospace'
    ctx.fillText(item.price, 680, y + 34)
  })

  // Summary panel
  ctx.fillStyle = '#0B1220'
  roundRect(ctx, 860, 120, 340, 420, 16)
  ctx.fill()
  ctx.fillStyle = '#E8EEF7'
  ctx.font = '700 20px Syne, system-ui, sans-serif'
  ctx.fillText('Order summary', 888, 170)
  ctx.font = '500 14px "IBM Plex Mono", monospace'
  ctx.fillStyle = '#8A9BB5'
  ctx.fillText('Subtotal', 888, 230)
  ctx.fillText(bugVisible ? '$0.00' : '$60.00', 1100, 230)
  ctx.fillText('Shipping', 888, 270)
  ctx.fillText('$0.00', 1100, 270)

  ctx.strokeStyle = 'rgba(232,238,247,0.15)'
  ctx.beginPath()
  ctx.moveTo(888, 300)
  ctx.lineTo(1160, 300)
  ctx.stroke()

  ctx.fillStyle = '#E8EEF7'
  ctx.font = '700 18px Syne, system-ui, sans-serif'
  ctx.fillText('Order total', 888, 350)
  ctx.fillStyle = bugVisible ? '#FF6B4A' : '#3DDC97'
  ctx.font = '700 28px "IBM Plex Mono", monospace'
  ctx.fillText(bugVisible ? '$0.00' : '$60.00', 1050, 350)

  // Pay button
  ctx.fillStyle = '#3DDC97'
  roundRect(ctx, 888, 400, 280, 52, 12)
  ctx.fill()
  ctx.fillStyle = '#0B1220'
  ctx.font = '700 16px Syne, system-ui, sans-serif'
  ctx.fillText('Pay now', 980, 432)

  if (highlight) {
    ctx.strokeStyle = '#FF6B4A'
    ctx.lineWidth = 4
    ctx.strokeRect(highlight.x, highlight.y, highlight.w, highlight.h)
    ctx.fillStyle = '#FF6B4A'
    ctx.font = '700 28px Syne, system-ui, sans-serif'
    ctx.fillText(highlight.markLabel, highlight.x + highlight.w + 12, highlight.y + 28)
  }

  return canvasToFrame(canvas, 0)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function canvasToFrame(
  canvas: HTMLCanvasElement,
  tMs: number,
  markId?: number,
): Promise<FrameAsset> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('frame encode failed'))),
      'image/jpeg',
      0.9,
    )
  })
  return {
    id: `sample-${tMs}-${markId ?? 'k'}`,
    tMs,
    markId,
    blob,
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    width: canvas.width,
    height: canvas.height,
  }
}

export async function loadSampleBundle() {
  const marks: Mark[] = [
    {
      id: 1,
      kind: 'pin',
      tMs: 4200,
      x: 1100,
      y: 340,
      nx: 1100 / 1280,
      ny: 340 / 800,
      label: '✎①',
      note: 'Order total stuck at $0.00 despite line items totaling $60',
    },
    {
      id: 2,
      kind: 'circle',
      tMs: 9800,
      x: 1028,
      y: 426,
      nx: 1028 / 1280,
      ny: 426 / 800,
      radius: 0.08,
      label: '✎②',
      note: 'Pay now stays enabled with a zero total',
    },
    {
      id: 3,
      kind: 'click',
      tMs: 11200,
      x: 1028,
      y: 426,
      nx: 1028 / 1280,
      ny: 426 / 800,
      label: '✎③',
      note: 'Click on Pay now',
    },
  ]

  const transcript: TranscriptChunk[] = [
    {
      tMs: 1200,
      text: 'Okay, I am on the checkout page with two items in the cart.',
      final: true,
    },
    {
      tMs: 4500,
      text: 'See mark one — the order total is stuck at zero dollars even though the line items add up to sixty.',
      final: true,
    },
    {
      tMs: 9000,
      text: 'And mark two — Pay now is still clickable, so a customer could submit a zero dollar order.',
      final: true,
    },
    {
      tMs: 13000,
      text: 'This looks like the summary panel is not reading cart line prices when it hydrates.',
      final: true,
    },
  ]

  const frame1 = await paintCheckoutFrame(
    'Cart hydrated · totals missing',
    { x: 1040, y: 318, w: 140, h: 48, markLabel: '✎①' },
    true,
  )
  frame1.tMs = 4200
  frame1.markId = 1
  frame1.id = 'sample-1'

  const frame2 = await paintCheckoutFrame(
    'Pay enabled with $0 total',
    { x: 880, y: 392, w: 296, h: 68, markLabel: '✎②' },
    true,
  )
  frame2.tMs = 9800
  frame2.markId = 2
  frame2.id = 'sample-2'

  const frame3 = await paintCheckoutFrame('After Pay click', null, true)
  frame3.tMs = 12000
  frame3.id = 'sample-3'

  const frames = [frame1, frame2, frame3]

  return assembleBundle({
    title: 'Broken checkout total ($0.00)',
    startedAt: new Date().toISOString(),
    durationMs: 16000,
    marks,
    transcript,
    frames,
    isSample: true,
  })
}
