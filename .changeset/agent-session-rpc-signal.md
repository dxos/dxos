---
'@dxos/plugin-host-cloudflare': patch
---

A bundle's RPC to a process it spawned through `Agent.spawn` no longer fails with `DataCloneError: AbortSignal serialization is not enabled`: the request crosses to EDGE's session target without the client's `AbortSignal`, which Workers RPC cannot carry.
