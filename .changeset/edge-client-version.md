---
'@dxos/edge-client': patch
'@dxos/protocols': patch
---

The EDGE connect flow's HTTP requests (`/auth` and its 401 fallback) send the SDK version in `X-DXOS-Version`, beside the WebSocket's `dxos-version.<v>` subprotocol entry, both built in `client-version.ts`; a 426 `client_too_old` from EDGE surfaces as `ClientTooOldError` instead of being retried as a missing challenge.
