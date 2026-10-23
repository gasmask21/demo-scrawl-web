# Turn into a task

**User-facing:** Optional rewrite of the scrawl into a crisp engineering task spec.

**Behavior:**
- POSTs to Netlify Function `turn-into-task` (`.mts`).
- Uses `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` when set on Netlify.
- Otherwise (and for Try sample) returns a canned task spec.
- Client also falls back to canned when the function is unreachable (static `serve`).

**Keys optional — demo always works.**
