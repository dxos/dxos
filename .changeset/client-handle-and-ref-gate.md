---
'@dxos/client': patch
'@dxos/plugin-client': patch
'@dxos/compute-runtime': patch
'@dxos/echo-client': patch
'@dxos/app-framework': patch
---

A `dx` command that runs an operation before anything reads the client no longer waits out the client's initialization timeout, and a client whose `destroy()` hangs no longer holds up shutdown past its five-second limit. An EDGE plugin operation now receives a reference envelope sent in an `Unknown` or `Any` input field as the data the caller sent, rather than the object it names. `forkFeed` at an item still waiting to be sent now waits for its block instead of throwing, which lets an agent hosted on EDGE open a conversation thread. The process manager resolves its process tree when something first reads it rather than at startup, so a `dx` command that never uses the client does not initialize it.
