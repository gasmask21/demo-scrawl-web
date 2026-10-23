---
name: verify-scrawl-web
description: Verify Scrawl Web locally — launch, doctor, drive sample path, collect evidence, cleanup.
---

# Verify Scrawl Web

## Launch

```bash
npm i
npm run build
npx serve dist -l 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

For Vite HMR during UI work: `npm run dev` (same port).

## Doctor

- [ ] `npm run build` exits 0.
- [ ] `dist/index.html` exists after build.
- [ ] `netlify.toml` has `command = "npm run build"`, `publish = "dist"`, SPA rewrite `/* → /index.html 200`.
- [ ] `netlify/functions/turn-into-task.mts` exists.
- [ ] No `.env` secrets committed; core flow needs zero keys.
- [ ] Chrome recommended (getDisplayMedia + Web Speech).

## Drive

1. Open the site → click **Try sample** (no permissions).
2. Confirm review shows contact sheet, transcript, and marks ✎① / ✎②.
3. Click **Download bundle (.zip)** → unzip and confirm:
   - `contact-sheet.png`
   - `frames/` with ≥1 jpg
   - `summary.md`
   - `scrawl.json`
4. Click **Copy for agent** → paste into an editor; expect markdown prompt.
5. Click **Turn into a task** → canned checkout task appears without keys.
6. (Optional, Chrome) **New scrawl** → **Start capture** → share a tab → place 2+ marks → **Stop** → download zip.

## Evidence

Capture:
- Landing with **Scrawl** brand + Start / Try sample.
- Review screen with contact sheet.
- Unzipped bundle listing (`contact-sheet.png`, `frames/`, `summary.md`, `scrawl.json`).

Optional live capture: overlay with REC pill and numbered marks.

## Cleanup

Stop `serve` / `vite` (Ctrl+C). Remove any downloaded `scrawl-*.zip` from the Downloads folder if desired. No server-side state to wipe.
