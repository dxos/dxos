---
'@dxos/client': patch
'@dxos/plugin-client': patch
'@dxos/compute-runtime': patch
---

A `dx` command that runs an operation before anything reads the client no longer waits out the client's initialization timeout, and a client whose `destroy()` hangs no longer holds up shutdown past its five-second limit. An EDGE plugin operation now receives a reference envelope sent in an `Unknown` or `Any` input field as the data the caller sent, rather than the object it names.
