---
'@dxos/compute-runtime': patch
---

`RemoteProcessHandle.subscribeEphemeral` no longer treats `RemoteTraceMonitor.layerNoop` as a live
trace source. The noop monitor hands back an empty stream, so a subscription took the pushed path,
replayed the host's (still empty) event ring and completed before the turn it was meant to observe
had started — a local-only deployment saw no ephemeral trace at all. It now falls back to polling
the ring, as it does when the tag is unset.
