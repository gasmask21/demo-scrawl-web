import type { FrameAsset, Mark } from '../types'
import { formatMs } from './format'

const COLS = 3
const CELL_W = 480
const CELL_H = 300
const PAD = 16
const HEADER = 56
const LABEL_H = 28

function drawMarkOnImage(
  ctx: CanvasRenderingContext2D,
  mark: Mark,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const x = dx + mark.nx * dw
  const y = dy + mark.ny * dh
  ctx.save()
  ctx.strokeStyle = '#FF6B4A'
  ctx.fillStyle = '#FF6B4A'
  ctx.lineWidth = Math.max(3, dw * 0.006)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (mark.kind === 'circle' && mark.radius) {
    ctx.beginPath()
    ctx.arc(x, y, mark.radius * Math.min(dw, dh), 0, Math.PI * 2)
    ctx.stroke()
  } else if (mark.path && mark.path.length > 1) {
    ctx.beginPath()
    mark.path.forEach((p, i) => {
      const px = dx + p.x * dw
      const py = dy + p.y * dh
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
  }

  const size = Math.max(16, dw * 0.035)
  ctx.beginPath()
  ctx.arc(x, y, size * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `700 ${Math.round(size)}px Syne, system-ui, sans-serif`
  ctx.strokeStyle = '#0B1220'
  ctx.lineWidth = 4
  ctx.strokeText(mark.label, x + size * 0.45, y - size * 0.15)
  ctx.fillStyle = '#FF6B4A'
  ctx.fillText(mark.label, x + size * 0.45, y - size * 0.15)
  ctx.restore()
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load frame image'))
    img.src = dataUrl
  })
}

export async function buildContactSheet(
  frames: FrameAsset[],
  marks: Mark[],
  title: string,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const count = Math.max(frames.length, 1)
  const rows = Math.ceil(count / COLS)
  const width = PAD + COLS * (CELL_W + PAD)
  const height = HEADER + PAD + rows * (CELL_H + LABEL_H + PAD)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, '#0B1220')
  grad.addColorStop(1, '#132033')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(61, 220, 151, 0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 24) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.fillStyle = '#E8EEF7'
  ctx.font = '700 28px Syne, system-ui, sans-serif'
  ctx.fillText('Scrawl · contact sheet', PAD, 36)
  ctx.font = '500 14px "IBM Plex Mono", monospace'
  ctx.fillStyle = '#3DDC97'
  ctx.fillText(title.slice(0, 80), PAD + 320, 34)

  if (frames.length === 0) {
    ctx.fillStyle = '#8A9BB5'
    ctx.font = '500 18px Syne, system-ui, sans-serif'
    ctx.fillText('No frames captured', PAD, HEADER + 40)
  }

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = PAD + col * (CELL_W + PAD)
    const y = HEADER + PAD + row * (CELL_H + LABEL_H + PAD)

    ctx.fillStyle = '#1A2436'
    ctx.fillRect(x, y, CELL_W, CELL_H)

    try {
      const img = await loadImage(frame.dataUrl)
      const scale = Math.min(CELL_W / img.width, CELL_H / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = x + (CELL_W - dw) / 2
      const dy = y + (CELL_H - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)

      const mark = marks.find((m) => m.id === frame.markId)
      if (mark) drawMarkOnImage(ctx, mark, dx, dy, dw, dh)
    } catch {
      ctx.fillStyle = '#8A9BB5'
      ctx.font = '14px "IBM Plex Mono", monospace'
      ctx.fillText('frame unavailable', x + 16, y + 40)
    }

    ctx.strokeStyle = 'rgba(232, 238, 247, 0.12)'
    ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1)

    const markLabel =
      frame.markId != null
        ? (marks.find((m) => m.id === frame.markId)?.label ?? `✎${frame.markId}`)
        : 'keyframe'
    ctx.fillStyle = '#E8EEF7'
    ctx.font = '600 13px "IBM Plex Mono", monospace'
    ctx.fillText(`${i + 1}. ${markLabel} · ${formatMs(frame.tMs)}`, x, y + CELL_H + 20)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })
  const dataUrl = canvas.toDataURL('image/png')
  return { blob, dataUrl, width, height }
}

export async function captureVideoFrame(
  video: HTMLVideoElement,
  tMs: number,
  markId?: number,
): Promise<FrameAsset | null> {
  if (!video.videoWidth || !video.videoHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!blob) return null
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return {
    id: `frame-${tMs}-${markId ?? 'k'}`,
    tMs,
    markId,
    blob,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  }
}
