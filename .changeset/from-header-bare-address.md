---
'@dxos/plugin-inbox': patch
---

Parse `From` headers that omit the display name or the angle brackets. A relay emitting a bare `user@example.com` previously synced the message with no sender at all, which also skipped contact resolution and no-reply detection.
