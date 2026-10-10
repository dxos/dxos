---
'@dxos/edge-client': patch
'@dxos/protocols': patch
---

The EDGE connect flow's HTTP requests (`/auth` and its 401 fallback) send the SDK version in `X-DXOS-Version`, beside the WebSocket's `dxos-version.<v>` subprotocol entry, both built in `client-version.ts`. EDGE's `client_too_old` refusal surfaces as `EdgeClientTooOldError`, an `EdgeCallFailedError` that is not retried, instead of being swallowed by the auth prefetch or retried as a missing challenge.
