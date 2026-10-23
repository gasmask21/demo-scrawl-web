import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { DrawTool, Mark, Point } from '../types'
import { formatMs } from '../lib/format'

interface CaptureOverlayProps {
  stream: MediaStream
  startedAt: number
  marks: Mark[]
  tool: DrawTool
  interimTranscript: string
  nextMarkId: number
  onToolChange: (tool: DrawTool) => void
  onAddMark: (mark: Mark) => void
  onUpdateMarkPath: (id: number, path: Point[], radius?: number) => void
  onStop: () => void
  videoRef: RefObject<HTMLVideoElement | null>
}

export function markLabelForId(id: number): string {
  if (id >= 1 && id <= 20) {
    return `✎${String.fromCodePoint(0x2460 + id - 1)}`
  }
  return `✎${id}`
}

export function CaptureOverlay({
  stream,
  startedAt,
  marks,
  tool,
  interimTranscript,
  nextMarkId,
  onToolChange,
  onAddMark,
  onUpdateMarkPath,
  onStop,
  videoRef,
}: CaptureOverlayProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const drawing = useRef<{
    markId: number
    points: Point[]
    origin: Point
  } | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => undefined)
  }, [stream, videoRef])

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt])

  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.floor(rect.width * dpr)
      const h = Math.floor(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      for (const mark of marks) {
        const x = mark.nx * rect.width
        const y = mark.ny * rect.height
        ctx.strokeStyle = '#FF6B4A'
        ctx.fillStyle = '#FF6B4A'
        ctx.lineWidth = 3
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'

        if (mark.kind === 'circle' && mark.radius) {
          ctx.beginPath()
          ctx.arc(
            x,
            y,
            mark.radius * Math.min(rect.width, rect.height),
            0,
            Math.PI * 2,
          )
          ctx.stroke()
        }
        if (mark.path && mark.path.length > 1) {
          ctx.beginPath()
          mark.path.forEach((p, i) => {
            const px = p.x * rect.width
            const py = p.y * rect.height
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = '700 18px Syne, system-ui, sans-serif'
        ctx.strokeStyle = '#0B1220'
        ctx.lineWidth = 4
        ctx.strokeText(mark.label, x + 12, y - 8)
        ctx.fillStyle = '#FF6B4A'
        ctx.fillText(mark.label, x + 12, y - 8)
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [marks])

  const toNorm = (clientX: number, clientY: number): Point => {
    const canvas = overlayRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    const p = toNorm(e.clientX, e.clientY)
    const rect = canvas.getBoundingClientRect()
    const tMs = Date.now() - startedAt
    const kind = tool === 'pin' ? 'pin' : tool === 'circle' ? 'circle' : 'pen'
    const id = nextMarkId
    const mark: Mark = {
      id,
      kind,
      tMs,
      x: p.x * rect.width,
      y: p.y * rect.height,
      nx: p.x,
      ny: p.y,
      label: markLabelForId(id),
      path: kind === 'pen' ? [p] : undefined,
      radius: kind === 'circle' ? 0.04 : undefined,
    }
    onAddMark(mark)
    drawing.current = {
      markId: id,
      points: [p],
      origin: p,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const p = toNorm(e.clientX, e.clientY)
    const d = drawing.current
    if (tool === 'pen') {
      d.points = [...d.points, p]
      onUpdateMarkPath(d.markId, d.points)
    } else if (tool === 'circle') {
      const dx = p.x - d.origin.x
      const dy = p.y - d.origin.y
      const r = Math.min(0.35, Math.hypot(dx, dy))
      onUpdateMarkPath(d.markId, [], r)
    }
  }

  const onPointerUp = () => {
    drawing.current = null
  }

  return (
    <div className="capture-root">
      <div className="capture-stage">
        <video ref={videoRef} className="capture-video" muted playsInline />
        <canvas
          ref={overlayRef}
          className="capture-overlay"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="capture-toolbar">
        <span className="rec-pill">
          <span className="rec-dot" />
          REC {formatMs(elapsed)} · {marks.length} marks
        </span>
        <div className="tool-group" role="group" aria-label="Draw tool">
          {(
            [
              ['pin', 'Mark'],
              ['circle', 'Circle'],
              ['pen', 'Pen'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tool-btn${tool === id ? ' active' : ''}`}
              onClick={() => onToolChange(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="transcript-live" title={interimTranscript}>
          {interimTranscript || 'Listening… speak the bug aloud'}
        </span>
        <button type="button" className="btn btn-danger btn-small" onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  )
}
