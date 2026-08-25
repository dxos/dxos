---
'@dxos/echo': minor
---

`Database.stats()` now reports in-memory residency alongside the stored counts, under a new `loaded` field split by realm: `loaded.client` (repo-proxy document handles, entity-manager object cores, cached feed handles and their resident feed objects, runtime registry entries) and `loaded.host` (cached automerge handles for the space and host-wide, plus active reactive queries). Stored counts distinguish what a space holds on disk; these distinguish what it is paying for in memory. Breaking for anyone constructing a `DatabaseStats` value directly — `loaded` is required.
