---
'@dxos/edge-client': minor
---

The EDGE WebSocket now advertises the client's compatibility level (`EDGE_CLIENT_COMPAT_LEVEL` from `@dxos/protocols`, sent as a `dxos-compat.<level>` entry in `Sec-WebSocket-Protocol`), so EDGE can tell which builds are still connecting.
