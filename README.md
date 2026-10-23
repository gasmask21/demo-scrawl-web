# Scrawl Web

**Show the agent, don't tell it.** Record a browser tab, talk and draw on it, then download an agent-ready bug bundle (`contact-sheet.png`, `frames/`, `summary.md`, `scrawl.json`) for Claude Code, Codex, or Cursor.

Inspired by [Kit Langton's Scrawl](https://github.com/kitlangton/scrawl) (native app) — this is a **browser / Netlify** demo of the same idea. No install. No API keys for the core flow.

## Quick start (local)

```bash
npm i
npm run build
npx serve dist -l 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Dev server:

```bash
npm run dev
```

## Netlify

This repo is Netlify-ready:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| SPA rewrite | `/*` → `/index.html` `200` |
| Functions | `netlify/functions/*.mts` |

Deploy by connecting the repo in Netlify, or:

```bash
npx netlify deploy --prod
```

Open the Netlify site URL after deploy. Use **Try sample** for a zero-permission demo, or **Start capture** in Chrome.

### Optional LLM (“Turn into a task”)

Set **one** of these as a Netlify environment variable (never commit keys):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

If unset, the function returns a **canned task spec** (and the sample path always uses canned).

## What you can do

1. **Start capture** — share a tab/window, narrate, place marks (pin / circle / pen).
2. **Stop** — review contact sheet + transcript.
3. **Download bundle (.zip)** — `contact-sheet.png`, `frames/`, `summary.md`, `scrawl.json`.
4. **Copy for agent** — markdown prompt (+ image when the clipboard API allows).
5. **Try sample** — broken-checkout demo with no screen share.
6. **Turn into a task** — optional Netlify Function → LLM or canned spec.

Feature notes live in [`features/`](./features/).

## Verify

Follow [`.cursor/skills/verify-scrawl-web/SKILL.md`](./.cursor/skills/verify-scrawl-web/SKILL.md) (Launch / Doctor / Drive / Evidence / Cleanup), or the checklist in [`DEMO.md`](./DEMO.md).

Minimum path: **Try sample** → **Download zip** → confirm the four zip contents. No keys.

## Browser support

**Chrome-first.** The demo needs `getDisplayMedia` and (for narration) the Web Speech API. Firefox/Safari may lack speech or behave differently on screen share. Marks + sample mode still work without speech.

## Stack

Vite · React · TypeScript · JSZip · Web Speech API · `getDisplayMedia` · Netlify Functions (optional)
