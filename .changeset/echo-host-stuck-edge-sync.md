---
'@dxos/echo': patch
---

Fragments in the pre-Automerge-3.5 shape that a client receives after its one-time migration are repaired on every open, so it no longer uploads fragments that hide a document's head from EDGE. The EDGE connect flow now sends the SDK version on `/auth` (`X-DXOS-Version`) as well as on the WebSocket, and EDGE's refusal of an outdated SDK surfaces as `EdgeClientTooOldError`, which is not retried.
