---
'@dxos/plugin-host-cloudflare': patch
---

A plugin bundle on EDGE no longer leaves a caller's cancellation wait pending when one of its skills fails to build, and no longer registers operations marked `skipRegistry`, or operations whose schema cannot be serialized.
