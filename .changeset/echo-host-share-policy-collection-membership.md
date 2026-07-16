---
'@dxos/echo-host': minor
---

Resolve a replicated document's containing space from local collection membership in the share policy, so a document whose handle is evicted or still loading is no longer falsely reported as belonging to no space, removing the false share-policy denials and the replication stalls they caused on both the edge/subduction and mesh replication paths.

Additionally, the subduction WASM console log level is set to `error` once the repo is constructed. Subduction syncs every document with every connected peer, so with multiple spaces each space-scoped edge peer is asked for every foreign document and correctly denied — and subduction_core logged each denial as a `not authorized to access sedimentree` warning, flooding the console (dispatch-scoping gap tracked as DX-1121). Set `localStorage.debug` to a value matching `subduction` (or set `globalThis.__SUBDUCTION_DEBUG`) to restore verbose WASM logging when debugging.

Breaking: `createIdFromSpaceKey` is no longer re-exported from `@dxos/echo-host`; import it from `@dxos/echo-protocol` instead.
