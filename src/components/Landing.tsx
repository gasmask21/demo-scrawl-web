interface LandingProps {
  onStart: () => void
  onSample: () => void
  busy?: boolean
  error?: string | null
}

export function Landing({ onStart, onSample, busy, error }: LandingProps) {
  return (
    <div className="page hero fade-in">
      <div className="hero-copy">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden />
          Scrawl
        </h1>
        <h2>Show the agent the bug — talk, mark, ship a bundle.</h2>
        <p>
          Record a tab, narrate the problem, and draw numbered marks on a live
          overlay. Stop to download an agent-ready zip: contact sheet, frames,
          summary.md, and scrawl.json. No API keys for the core flow.
        </p>
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onStart}
            disabled={busy}
          >
            Start capture
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onSample}
            disabled={busy}
          >
            Try sample
          </button>
        </div>
        {error ? <div className="status-banner error">{error}</div> : null}
        <p className="meta-note">
          Chrome-first · getDisplayMedia + Web Speech · Free Netlify deploy
        </p>
      </div>
    </div>
  )
}
