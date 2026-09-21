---
'@dxos/compute-runtime': patch
'@dxos/compute': patch
---

Remote process control can now run as a durable command queue. `QueuedRemoteControl` wraps a
`RemoteProcessManager.Control` in a write-ahead log persisted to the same KeyValueStore as the process
registry: spawns, inputs and terminations are durable before they are pushed, delivered in order with a
stable idempotency key, and retried with exponential backoff or as soon as the connection is signalled up.
Client-side state moves immediately — a queued process reads as the new `Process.State.STARTING`, a
terminated one as `TERMINATING`, and inputs are buffered — and a process observed terminal releases
whatever is still queued for it. `Control`'s mutating verbs take an optional `idempotencyKey` so a host
can make an at-least-once queue at-most-once.
