---
'@dxos/echo': patch
---

A document that falls behind its sync server while a Subduction round is already in flight now catches up: the resync requested for it is no longer dropped when that round settles. `createFileProcessor` from `@dxos/log/file-processor` writes the requested levels again when no filters are passed, and opens its file once instead of on every entry.
