export type MarkKind = 'pin' | 'circle' | 'pen' | 'click'

export interface Point {
  x: number
  y: number
}

export interface Mark {
  id: number
  kind: MarkKind
  tMs: number
  x: number
  y: number
  label: string
  /** Normalized 0–1 coords relative to capture surface */
  nx: number
  ny: number
  radius?: number
  path?: Point[]
  note?: string
}

export interface TranscriptChunk {
  tMs: number
  text: string
  final: boolean
}

export interface FrameAsset {
  id: string
  tMs: number
  markId?: number
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

export interface ScrawlBundle {
  startedAt: string
  durationMs: number
  marks: Mark[]
  transcript: TranscriptChunk[]
  frames: FrameAsset[]
  contactSheetPng: Blob
  contactSheetUrl: string
  summaryMd: string
  scrawlJson: ScrawlDocument
  isSample?: boolean
}

export interface ScrawlDocument {
  version: 1
  app: 'scrawl-web'
  createdAt: string
  durationMs: number
  title: string
  marks: Array<{
    id: number
    kind: MarkKind
    tMs: number
    label: string
    x: number
    y: number
    nx: number
    ny: number
    radius?: number
    note?: string
  }>
  transcript: Array<{ tMs: number; text: string }>
  timeline: Array<{
    tMs: number
    type: 'mark' | 'click' | 'speech' | 'keyframe'
    label: string
    markId?: number
  }>
  frames: Array<{
    file: string
    tMs: number
    markId?: number
  }>
  contactSheet: string
}

export type AppPhase = 'landing' | 'capturing' | 'processing' | 'review' | 'error'

export type DrawTool = 'pin' | 'circle' | 'pen'
