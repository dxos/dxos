---
'@dxos/edge-client': patch
'@dxos/protocols': patch
---

The EDGE connect flow (`/auth`, its 401 fallback and the WebSocket upgrade) advertises the SDK version as a `dxos-version` query parameter instead of a WebSocket subprotocol entry, and a 426 refusal from EDGE surfaces as `ClientTooOldError` instead of being retried as a missing challenge.
