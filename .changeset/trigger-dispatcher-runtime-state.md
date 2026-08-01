---
'@dxos/functions-runtime': minor
---

Unify the local trigger dispatcher runtime state into a single per-trigger map across all trigger kinds, re-invoke triggers that raise `RunAgainError` at the tail of the invocation queue, enforce the global concurrency limit across every invocation path, and expose per-trigger runtime status (next run, cooldown, pending retry, last result) on the dispatcher state.
