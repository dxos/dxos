---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

A feed append that keeps failing is retried on its backoff only: `db.flush()` and new writes wait for the scheduled retry instead of resending at once, so a persistent storage failure no longer turns every flush into a burst of sends. Errors that cross a service RPC keep their cause chain in the stack, and the space save indicator reports a failed flush as unsaved instead of raising an unhandled rejection.
