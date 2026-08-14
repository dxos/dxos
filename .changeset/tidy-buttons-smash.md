---
'@dxos/echo': patch
---

Retry an EDGE trigger force-run with exponential backoff while the trigger is not yet replicated to EDGE, so a manual sync started right after a connection is created no longer fails.
