---
'@dxos/client-services': patch
---

Compose the package from subsystems, dissolving `layer-specs.ts` into them.

`layer-specs.ts` was a second, parallel description of the package: 813 lines and 60 specs, each
naming a layer defined somewhere else, in a file importing from twelve of the eighteen packlets.
Each layer now carries its own spec, and each subsystem exports the specs it owns, so the host
concatenates four lists instead of maintaining one list of sixty names.

`internal/` gains tiers: `kernel/` (storage, metadata, pipelines) and `mesh/` (signalling,
transport, the swarm) so far, with echo, halo and the host to follow.

No public surface changes — the namespaces `index.ts` exports are unchanged, and every symbol
that moved between internal modules had no consumer outside this package.
