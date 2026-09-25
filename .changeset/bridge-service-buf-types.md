---
'@dxos/client': minor
---

Move the WebRTC transport bridge to buf types

`BridgeService`'s RPC payloads are buf messages. The transport itself (`RtcTransportService`,
`RtcTransportProxyFactory`) keeps the protobuf.js shapes, and `bridge-codec.ts` converts at the RPC
boundary, so consumers of the transport interface are unaffected. Both codecs produce identical
wire bytes.
