---
'@dxos/edge-client': patch
---

Every HTTP request to EDGE now carries the SDK version in an `X-DXOS-Version` header (`EDGE_CLIENT_VERSION_HEADER` in `@dxos/protocols`), as the WebSocket already does in its subprotocol list, so EDGE can turn away builds older than the oldest it serves.
