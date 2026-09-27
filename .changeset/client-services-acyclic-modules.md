---
'@dxos/client-services': minor
---

Restructure the package: acyclic module graph, subsystem contracts, namespaces-only exports.

**Breaking.** Every import from this package changes; the sections below say how.

**The package has no flat exports.** Everything is reached through a namespace —
`Storage.createStorageObjects`, `Spaces.DataSpace`, `ServiceStack.layerClientServices`,
`WorkerRuntime.makeWorkerRuntime` — and the implementations live under `src/internal/`, which is
not exported. The `./testing` subpath is unchanged.

**Services are reached through their subsystem's contract**, not through a tag next to the
implementation: `IdentityContract.ManagerService`, `SpacesContract.ManagerService`,
`InvitationsContract.ManagerService`, and the `Provider`/`Lifecycle`/`SigningContextProvider` tags
alongside them. Each contract owns the interfaces its tags are typed against, so depending on a
service no longer means depending on the class that implements it.

The whole space subsystem is one namespace: `Spaces` now covers the transport-level space and its
manager, the data spaces above it, and the archive format — there is no `Space` or `SpaceExport`.

Two namespaces could not take their obvious name: `Worker` collides with
`@dxos/worker-framework/Worker`, so the runtime is `WorkerRuntime`; `Platform` collides with the
`Platform` message type from `@dxos/protocols`, so the probe is `PlatformInfo`.

Why: the 19 packlets contained one strongly connected component of 11, because `packlets/services/`
was simultaneously the top of the stack (the layer-spec aggregation) and the bottom (the lifecycle
events, readiness gate, SQLite storage and platform probe every packlet imports), and because each
`Context` tag was declared next to the class it wraps. The graph goes from 57 edges and an
11-packlet cycle to 33 edges and none. `moon run client-services:graph` asserts both the absence of
cycles and that no contract imports an implementation — on type edges as well as runtime ones, since
a tag typed against a class keeps the dependency while erasing the import that would show it.

Rationale and measurements: `docs/DEPENDENCY-GRAPH.md` and `docs/REFACTOR.md`.
