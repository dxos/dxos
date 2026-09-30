---
'@dxos/compute-runtime': patch
'@dxos/plugin-routine': patch
---

Remote process control now runs as a durable command queue. `QueuedRemoteControl` wraps a
`RemoteProcessManager.Control` in a write-ahead log persisted to the same KeyValueStore as the process
registry: spawns, inputs and terminations are durable before they are pushed, delivered in order with a
stable idempotency key, and retried with exponential backoff or as soon as the connection is signalled up.
Client-side state moves immediately — a queued process reads as the new `Process.State.STARTING`, a
terminated one as `TERMINATING`, and inputs are buffered — and a process observed terminal releases
whatever is still queued for it. The EDGE path uses it: `EdgeProcessManager.fromClient` takes the store to
queue into, the app wires it to the process registry's own IndexedDB database and to the browser's
back-online event, and `idempotencyKey` travels on the spawn, input and terminate routes so the host can
make an at-least-once queue at-most-once.
