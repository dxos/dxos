---
'@dxos/edge-client': minor
---

The EDGE WebSocket now advertises the client's SDK version, sent as a `dxos-version.<semver>` entry in `Sec-WebSocket-Protocol` (prefix `EDGE_CLIENT_VERSION_PROTOCOL_PREFIX` from `@dxos/protocols`), so EDGE can tell which builds are connecting.
