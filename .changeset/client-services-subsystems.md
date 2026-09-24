---
'@dxos/client-services': patch
---

Compose the package from subsystems, dissolving `layer-specs.ts` into them.

`layer-specs.ts` was a second, parallel description of the package: 813 lines and 60 specs, each
naming a layer defined somewhere else, in a file importing from twelve of the eighteen packlets.
Each layer now carries its own spec, and each subsystem exports the specs it owns, so the host
concatenates four lists instead of maintaining one list of sixty names.

`internal/` is now five subsystems rather than eighteen peers: `kernel/` (storage, metadata,
pipelines), `mesh/` (signalling, transport, the swarm), `echo/` (the space stack, data spaces,
replication), `halo/` (identity, devices, invitations) and `host/` (the router, the stack and the
introspection services). The package graph goes from 19 modules and 57 edges with an 11-module
cycle to 6 modules and 11 edges with none.

No public surface changes — the namespaces `index.ts` exports are unchanged, and every symbol
that moved between internal modules had no consumer outside this package.
