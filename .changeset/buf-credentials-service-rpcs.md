---
'@dxos/protocols': patch
'@dxos/client-protocol': patch
'@dxos/client': patch
'@dxos/client-services': patch
---

Move the identity, contacts, devices and spaces service RPCs to buf messages, and correct
`ClientServices` to declare the buf shapes those methods actually carry. The credential subsystem
keeps its protobuf.js shapes — the payloads cross the RPC boundary as their shared wire bytes — so
`@dxos/client`'s public API is unchanged.
