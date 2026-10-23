import { useCallback, useEffect, useRef, useState } from 'react'
import { CaptureOverlay, markLabelForId } from './components/CaptureOverlay'
import { Landing } from './components/Landing'
import { Review } from './components/Review'
import { assembleBundle } from './lib/bundle'
import { captureVideoFrame } from './lib/contactSheet'
import { loadSampleBundle } from './lib/sample'
import { LiveTranscript, speechSupported } from './lib/speech'
import type {
  AppPhase,
  DrawTool,
  FrameAsset,
  Mark,
  Point,
  ScrawlBundle,
  TranscriptChunk,
} from './types'

const KEYFRAME_EVERY_MS = 4000

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('landing')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [marks, setMarks] = useState<Mark[]>([])
  const [tool, setTool] = useState<DrawTool>('pin')
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([])
  const [bundle, setBundle] = useState<ScrawlBundle | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const framesRef = useRef<FrameAsset[]>([])
  const marksRef = useRef<Mark[]>([])
  const transcriptRef = useRef<TranscriptChunk[]>([])
  const speechRef = useRef<LiveTranscript | null>(null)
  const keyframeTimer = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const stoppingRef = useRef(false)

  useEffect(() => {
    marksRef.current = marks
  }, [marks])

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  const cleanupCapture = useCallback(() => {
    if (keyframeTimer.current != null) {
      window.clearInterval(keyframeTimer.current)
      keyframeTimer.current = null
    }
    speechRef.current?.stop()
    speechRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  useEffect(() => () => cleanupCapture(), [cleanupCapture])

  const grabFrame = useCallback(async (markId?: number) => {
    const video = videoRef.current
    if (!video) return
    const tMs = Date.now() - startedAtRef.current
    const frame = await captureVideoFrame(video, tMs, markId)
    if (frame) framesRef.current = [...framesRef.current, frame]
  }, [])

  const finishCapture = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    setPhase('processing')

    const durationMs = Date.now() - startedAtRef.current
    const finalTranscript = speechRef.current?.stop() ?? transcriptRef.current
    speechRef.current = null

    await grabFrame()

    if (keyframeTimer.current != null) {
      window.clearInterval(keyframeTimer.current)
      keyframeTimer.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)

    try {
      const assembled = await assembleBundle({
        title: 'Scrawl capture',
        startedAt: new Date(startedAtRef.current).toISOString(),
        durationMs,
        marks: marksRef.current,
        transcript: finalTranscript.filter((c) => c.text.trim()),
        frames: framesRef.current,
      })
      setBundle(assembled)
      setPhase('review')
    } catch (err) {
      setPhase('landing')
      setError(err instanceof Error ? err.message : 'Failed to build bundle')
    }
  }, [grabFrame])

  const startCapture = async () => {
    setError(null)
    setBusy(true)
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('getDisplayMedia is not supported in this browser. Use Chrome.')
      }

      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      })

      const now = Date.now()
      startedAtRef.current = now
      framesRef.current = []
      marksRef.current = []
      setMarks([])
      setTranscript([])
      setInterim('')
      setStartedAt(now)
      streamRef.current = display
      setStream(display)
      setPhase('capturing')
      stoppingRef.current = false

      display.getVideoTracks()[0]?.addEventListener('ended', () => {
        void finishCapture()
      })

      const speech = new LiveTranscript((chunks, live) => {
        setTranscript(chunks)
        setInterim(live)
      })
      speechRef.current = speech
      const speechStart = speech.start(now)
      if (!speechStart.ok) {
        setInterim(
          speechSupported()
            ? (speechStart.reason ?? 'Speech unavailable')
            : 'Web Speech unavailable — marks still work',
        )
      }

      window.setTimeout(() => {
        void grabFrame()
      }, 600)

      keyframeTimer.current = window.setInterval(() => {
        void grabFrame()
      }, KEYFRAME_EVERY_MS)
    } catch (err) {
      cleanupCapture()
      setPhase('landing')
      setError(
        err instanceof Error
          ? err.message
          : 'Could not start capture. Allow screen share in Chrome and try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onAddMark = (mark: Mark) => {
    setMarks((prev) => {
      const next = [...prev, mark]
      marksRef.current = next
      return next
    })
    void grabFrame(mark.id)
  }

  const onUpdateMarkPath = (id: number, path: Point[], radius?: number) => {
    setMarks((prev) => {
      const next = prev.map((m) =>
        m.id === id
          ? {
              ...m,
              path: path.length ? path : m.path,
              radius: radius ?? m.radius,
              label: m.label || markLabelForId(id),
            }
          : m,
      )
      marksRef.current = next
      return next
    })
  }

  const onSample = async () => {
    setBusy(true)
    setError(null)
    setPhase('processing')
    try {
      const sample = await loadSampleBundle()
      setBundle(sample)
      setPhase('review')
    } catch (err) {
      setPhase('landing')
      setError(err instanceof Error ? err.message : 'Sample failed to load')
    } finally {
      setBusy(false)
    }
  }

  const onReset = () => {
    cleanupCapture()
    stoppingRef.current = false
    setBundle(null)
    setMarks([])
    setTranscript([])
    setInterim('')
    setError(null)
    setPhase('landing')
  }

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />
      {phase === 'landing' ? (
        <Landing
          onStart={() => void startCapture()}
          onSample={() => void onSample()}
          busy={busy}
          error={error}
        />
      ) : null}

      {phase === 'capturing' && stream ? (
        <CaptureOverlay
          stream={stream}
          startedAt={startedAt}
          marks={marks}
          tool={tool}
          interimTranscript={
            interim ||
            (transcript.length ? (transcript[transcript.length - 1]?.text ?? '') : '')
          }
          nextMarkId={marks.length + 1}
          onToolChange={setTool}
          onAddMark={onAddMark}
          onUpdateMarkPath={onUpdateMarkPath}
          onStop={() => void finishCapture()}
          videoRef={videoRef}
        />
      ) : null}

      {phase === 'processing' ? (
        <div className="page processing fade-in">
          <div className="spinner" />
          <h2>Building contact sheet…</h2>
          <p className="meta-note">Packing frames, transcript, and scrawl.json</p>
        </div>
      ) : null}

      {phase === 'review' && bundle ? (
        <Review bundle={bundle} onReset={onReset} />
      ) : null}
    </div>
  )
}
