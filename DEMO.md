# Scrawl Web — demo checklist

## PASS / FAIL

| # | Check | Pass? |
| --- | --- | --- |
| 1 | `npm run build` succeeds | ☐ |
| 2 | Landing shows **Start capture** and **Try sample** | ☐ |
| 3 | **Try sample** opens review with contact sheet + transcript | ☐ |
| 4 | **Download bundle (.zip)** contains `contact-sheet.png`, `frames/`, `summary.md`, `scrawl.json` | ☐ |
| 5 | **Copy for agent** puts a usable prompt on the clipboard | ☐ |
| 6 | **Turn into a task** returns a task spec with **no API keys** | ☐ |
| 7 | (Chrome) **Start capture** → overlay marks → **Stop** → review + zip | ☐ |
| 8 | README documents Netlify open + verify; core + sample need no keys | ☐ |

**Finish condition:** rows 1–6 and 8 must pass. Row 7 is preferred when screen share is available.

## How to run

```bash
npm i && npm run build && npx serve dist -l 43127
```

Open http://127.0.0.1:43127 — use **Try sample** first.
