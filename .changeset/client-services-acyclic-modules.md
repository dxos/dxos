---
'@dxos/client-services': minor
---

Restructure the package into an acyclic module graph.

The 19 packlets contained one strongly connected component of 11 of them, because
`packlets/services/` was simultaneously the top of the stack (the layer-spec
aggregation) and the bottom (the lifecycle events, readiness gate, SQLite storage
and platform probe that every packlet imports), and because each `Context` service
tag was declared next to the class it wraps — so declaring a dependency on a peer
pulled in that peer's implementation.

- The kernel primitives move to `src/Events.ts`, `src/Readiness.ts`,
  `src/SqliteStorage.ts`, `src/Platform.ts` and `src/migrations/`.
- `Auth`, `Identity`, `Replication` and `CredentialsDocument` become tier-1
  modules; `space-export` takes the three members it reads as `ExportableSpace`
  rather than importing `DataSpace`.
- The six tags whose consumers sit beside or below their implementation move to
  `src/Tags.ts`, which types each one through a type-only import — erased on emit,
  so no runtime edge.

The graph goes from 57 edges and an 11-packlet cycle to 33 edges and none;
`moon run client-services:graph` asserts it. Rationale and the remaining stages
are in `docs/DEPENDENCY-GRAPH.md` and `docs/REFACTOR.md`.

`IdentityManagerService`, `IdentityProviderService`, `IdentityLifecycleService`,
`InvitationsManagerService`, `DataSpaceManagerService` and
`SigningContextProviderService` are now reached through the `Tags` namespace;
`Events`, `Platform`, `Readiness` and `SqliteStorage` are namespace exports.
