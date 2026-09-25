---
'@dxos/echo': patch
---

Retry an EDGE trigger force-run with exponential backoff, so a manual sync started right after a connection is created no longer fails while EDGE catches up with the client.
