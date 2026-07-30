---
'@dxos/echo-panproto': patch
---

`useLens` no longer caches the lensed view behind a change signal. A derived atom does not invalidate for string-CRDT splices, so a lens over a text object could serve a projection the object had already moved past; the hook now subscribes for the render schedule and projects on every render.
