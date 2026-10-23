# Live transcript

**User-facing:** Spoken narration appears in the capture toolbar and lands in the review screen.

**Behavior:**
- Uses the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- Chunks are time-aligned into `summary.md` and `scrawl.json`.
- If speech is denied or unavailable, capture and marks still work.

**No API keys required.**
