---
'@dxos/functions-runtime-cloudflare': patch
---

A function invocation now sees what a nested operation call wrote once that call returns, so objects the call created or edited are no longer missing or stale in the caller.
