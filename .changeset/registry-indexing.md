---
'@dxos/index-core': minor
'@dxos/echo-host': minor
'@dxos/echo-client': minor
'@dxos/protocols': minor
---

The client's in-process registry is now indexed on the host, so code-shipped entities (types, operations, skills) are reachable from the index rather than only from a client-side in-memory match.

An `EchoClient` mirrors its registry to the host over the new `QueryService.updateRegistry` RPC whenever it changes; the host buffers the snapshot in a `RegistryDataSource` and feeds it through the same indexing pass as automerge documents and feeds. Registered entities land in `objectMeta` and the FTS snapshot table alongside everything else, marked by a new non-empty `registryKey` column.

Registry rows belong to no space, and every space- or queue-scoped read excludes them — `IndexEngine.queryRegistry` (and `EchoHost.queryIndexedRegistry`) is the only way to read them back. Existing query behaviour is therefore unchanged.

Entry identity is the registered key, version included: `dxn:<nsid>:0.1.0` and `dxn:<nsid>:0.2.0` are separate entries, while re-registering one version replaces that entry — the object registered last is primary, and an unversioned lookup returns the versions newest-registration-first. Unchanged re-pushes are recognised by a content digest, so a restart, which re-pushes the whole registry, costs one query rather than a re-index. The host keeps the union of its clients' registries, so an entry is reclaimed only once no client carries it.

`objectMeta` gains `registryKey` and `contentHash` via migration `0008_registry`; both default to empty/null on existing rows, so no reindex is required.
