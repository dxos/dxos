---
'@dxos/echo-client': patch
---

A feed append that fails because the client services endpoint has closed (identity reset, worker handover) is no longer retried on the next tick forever; background flushes are also capped at ten per second. Previously a closed endpoint turned the retry into a busy loop of `RpcClosedError` that could stall the page — most visibly as a device invitation that never reloaded into the join shell after "Join existing identity".

The in-process `MemoryTransport` now waits 10s (was 1s) for the initiator's handshake signal, matching the connection's own transport budget, so a test that signals through a deployed edge router no longer fails ~3.5% of invitations on latency alone.
