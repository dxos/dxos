---
'@dxos/rpc': minor
---

Bump effect to `4.0.0-rc.115`.

`RpcSerialization.msgPack` was removed upstream, so the `RpcPort` protocols no longer hard-code
msgpack. `layerProtocolRpcPortClient` / `layerProtocolRpcPortServer` are unchanged for callers —
they now supply `RpcSerialization.layerSchemaBinary()` themselves — while
`makeProtocolRpcPortClient` / `makeProtocolRpcPortServer` take the format from the ambient
`RpcSerialization` and require it, so a caller composing them directly must provide a binary one.

The wire format changes with it; both ends of a port are built from the same version, so this
only matters to a peer pinned to an older build.
