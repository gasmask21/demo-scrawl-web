import type { TranscriptChunk } from '../types'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionResultEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

export class LiveTranscript {
  private recognition: SpeechRecognitionLike | null = null
  private startedAt = 0
  private chunks: TranscriptChunk[] = []
  private interim = ''
  private shouldRun = false
  private onUpdate: (chunks: TranscriptChunk[], interim: string) => void

  constructor(onUpdate: (chunks: TranscriptChunk[], interim: string) => void) {
    this.onUpdate = onUpdate
  }

  getChunks(): TranscriptChunk[] {
    return [...this.chunks]
  }

  start(startedAt: number): { ok: boolean; reason?: string } {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      return { ok: false, reason: 'Web Speech API is not available in this browser.' }
    }

    this.startedAt = startedAt
    this.chunks = []
    this.interim = ''
    this.shouldRun = true

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (!text) continue
        if (result.isFinal) {
          this.chunks.push({
            tMs: Date.now() - this.startedAt,
            text,
            final: true,
          })
          this.interim = ''
        } else {
          interim += (interim ? ' ' : '') + text
        }
      }
      if (interim) this.interim = interim
      this.onUpdate(this.getChunks(), this.interim)
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      // Keep going for recoverable errors; surface via interim note
      if (event.error === 'not-allowed') {
        this.interim = '(mic permission denied — marks still work)'
        this.onUpdate(this.getChunks(), this.interim)
        this.shouldRun = false
      }
    }

    recognition.onend = () => {
      if (this.shouldRun) {
        try {
          recognition.start()
        } catch {
          /* already started */
        }
      }
    }

    this.recognition = recognition
    try {
      recognition.start()
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : 'Could not start speech recognition',
      }
    }
  }

  stop(): TranscriptChunk[] {
    this.shouldRun = false
    try {
      this.recognition?.stop()
    } catch {
      /* ignore */
    }
    this.recognition = null
    if (this.interim.trim()) {
      this.chunks.push({
        tMs: Date.now() - this.startedAt,
        text: this.interim.trim(),
        final: true,
      })
      this.interim = ''
    }
    return this.getChunks()
  }
}
