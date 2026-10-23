# Start capture

**User-facing:** Landing CTA that begins a tab/window recording.

**Behavior:**
- Calls `navigator.mediaDevices.getDisplayMedia` (video only).
- Starts a live canvas overlay, keyframe timer, and Web Speech transcript.
- Chrome-first; unsupported browsers see an error on the landing page.

**No API keys required.**
