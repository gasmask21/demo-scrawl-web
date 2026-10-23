import { useState } from 'react'
import type { ScrawlBundle } from '../types'
import { agentPromptFromBundle, zipBundle } from '../lib/bundle'
import { copyForAgent, turnIntoTask } from '../lib/clipboard'
import { downloadBlob, formatMsPrecise } from '../lib/format'

interface ReviewProps {
  bundle: ScrawlBundle
  onReset: () => void
}

export function Review({ bundle, onReset }: ReviewProps) {
  const [status, setStatus] = useState<string | null>(null)
  const [statusError, setStatusError] = useState(false)
  const [task, setTask] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onDownload = async () => {
    setBusy(true)
    setStatusError(false)
    try {
      const blob = await zipBundle(bundle)
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      downloadBlob(blob, `scrawl-${stamp}.zip`)
      setStatus('Downloaded zip with contact-sheet.png, frames/, summary.md, scrawl.json.')
    } catch (err) {
      setStatusError(true)
      setStatus(err instanceof Error ? err.message : 'Zip failed')
    } finally {
      setBusy(false)
    }
  }

  const onCopy = async () => {
    setBusy(true)
    setStatusError(false)
    const result = await copyForAgent(bundle)
    setStatusError(!result.ok)
    setStatus(result.detail)
    setBusy(false)
  }

  const onTask = async () => {
    setBusy(true)
    setStatusError(false)
    setStatus('Turning into a task…')
    const result = await turnIntoTask(bundle)
    setTask(result.task)
    setStatus(
      result.source === 'llm'
        ? 'Task rewritten by LLM.'
        : 'Canned task spec (no OPENAI/ANTHROPIC key — expected for demos).',
    )
    setBusy(false)
  }

  const onCopyTask = async () => {
    const text = task ?? agentPromptFromBundle(bundle)
    try {
      await navigator.clipboard.writeText(text)
      setStatusError(false)
      setStatus('Task / prompt copied.')
    } catch {
      setStatusError(true)
      setStatus('Could not copy to clipboard.')
    }
  }

  return (
    <div className="page fade-in">
      <div className="review-header">
        <div>
          <h1>{bundle.isSample ? 'Sample review' : 'Review scrawl'}</h1>
          <p>
            {formatMsPrecise(bundle.durationMs)} · {bundle.marks.length} marks ·{' '}
            {bundle.frames.length} frames
            {bundle.isSample ? ' · broken checkout demo' : ''}
          </p>
        </div>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={onDownload} disabled={busy}>
            Download bundle (.zip)
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCopy} disabled={busy}>
            Copy for agent
          </button>
          <button type="button" className="btn btn-ghost" onClick={onTask} disabled={busy}>
            Turn into a task
          </button>
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            New scrawl
          </button>
        </div>
      </div>

      <div className="review-grid">
        <section className="panel">
          <h3>Contact sheet</h3>
          <img
            className="contact-sheet-img"
            src={bundle.contactSheetUrl}
            alt="Annotated contact sheet of scrawl keyframes"
          />
        </section>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <section className="panel">
            <h3>Transcript</h3>
            {bundle.transcript.length === 0 ? (
              <p className="meta-note" style={{ margin: 0 }}>
                No speech captured. Marks still export cleanly.
              </p>
            ) : (
              <ul className="transcript-list">
                {bundle.transcript.map((chunk, i) => (
                  <li key={`${chunk.tMs}-${i}`}>
                    <strong>[{formatMsPrecise(chunk.tMs)}]</strong> {chunk.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h3>Marks</h3>
            <ul className="marks-list">
              {bundle.marks.map((mark) => (
                <li key={mark.id}>
                  <span className="mark-label">{mark.label}</span>
                  <span>
                    {mark.kind} · {formatMsPrecise(mark.tMs)}
                    {mark.note ? ` — ${mark.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {status ? (
        <div className={`status-banner${statusError ? ' error' : ''}`}>{status}</div>
      ) : null}

      {task ? (
        <section className="panel" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Task spec</h3>
            <button type="button" className="btn btn-ghost btn-small" onClick={onCopyTask}>
              Copy task
            </button>
          </div>
          <pre className="task-box">{task}</pre>
        </section>
      ) : null}
    </div>
  )
}
