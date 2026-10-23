# Copy for agent

**User-facing:** Copies an agent-ready prompt (markdown + structured JSON).

**Behavior:**
- Prefers `ClipboardItem` with text + contact-sheet PNG when the browser allows it.
- Falls back to text-only clipboard write.
- Prompt tells the coding agent how to use the zip assets.

**No API keys required.**
