# Appendix: ECHO / HALO architecture report

> Generated from a source review of this repo (2026-07-24), focused on the
> aspects relevant for comparison with an automerge-repo-based system
> (Ink & Switch Patchwork).

## 1. Automerge usage — confirmed foundation

ECHO is built directly on `@automerge/automerge` + `@automerge/automerge-repo`, plus the `@automerge/automerge-subduction` extension (a "sedimentree" transport layered on automerge-repo). Dependency evidence: `packages/core/echo/echo-client/package.json:38-39`, `packages/core/echo/echo-host/package.json:45-47`.

The core host-side wrapper is `AutomergeHost` (`packages/core/echo/echo-host/src/automerge/automerge-host.ts:158`) — "Abstracts over the AutomergeRepo," holding a real `Repo`, a `SqliteStorageAdapter` (`automerge-host.ts:169`), and a `SqliteHeadsStore`. It optionally runs Subduction as the byte-transport (`useSubduction` flag, `automerge-host.ts:74-93`) or falls back to a classical automerge-repo network adapter.

**Document structure is per-space, not strictly one-doc-per-object.** Each space owns one root "directory" document, `DatabaseDirectory` (`packages/core/echo/echo-protocol/src/document-structure.ts:29-80`):

```ts
export interface DatabaseDirectory {
  version?: SpaceDocVersion;
  access?: { spaceId?: SpaceId; spaceKey?: string };
  objects?: { [id: string]: EntityStructure }; // inlined objects
  links?: { [echoUri: string]: string | RawString }; // objectId -> automerge doc URL
  branches?: SpaceBranchRegistry;
}
```

The **default placement for a new object is its own separate automerge document**, linked from the root doc's `links` map — `packages/core/echo/echo-client/src/core-db/entity-manager.ts:514-534` (`placeIn: 'linked-doc' | 'root-doc'`). Real topology: **one directory/manifest doc per space + one automerge doc per object (default), with an inlining fast path for small objects.** automerge-repo itself has no built-in directory-document concept; that's a DXOS layer.

**Storage adapter**: SQLite-backed, `sqlite-storage-adapter.ts:35` — implements automerge-repo's `StorageAdapterInterface`, storing raw automerge chunks in an `automerge_chunks` table (`sqlite-storage-adapter.ts:63-73`). An older `LevelDBStorageAdapter` also exists (being replaced).

**Network adapter**: `EchoNetworkAdapter` (`echo-network-adapter.ts`) is DXOS's automerge-repo `NetworkAdapter` implementation, fed by a generic `AutomergeReplicator` interface (`echo-replicator.ts:30-40`) that both EDGE and MESH implement (§6).

Client-side, `echo-client` never talks to the automerge `Repo` directly — it proxies documents over RPC (`RepoProxy`/`DocHandleProxy`, `packages/core/echo/echo-client/src/automerge/`) to whatever process hosts the real `AutomergeHost` (worker, node agent, or EDGE-connected process). `EchoClient` (`echo-client.ts:64`) connects via `DataService`/`QueryService`/`FeedService` RPC clients.

## 2. Spaces

A **Space** is DXOS's collaboration/replication/access-control boundary. Public interface: `packages/sdk/client-protocol/src/space.ts:78` — `id: SpaceId`, `db: EchoDatabase`, `members`, `invitations`, `properties`, `open()/close()/delete()`, `state`. `SpaceInternal` (`space.ts:43-74`) adds `getCredentials()`, `getEpochs()`, `createEpoch()`, `export()`, `migrate()`, `setEdgeReplicationPreference()`, `syncToEdge()`.

Concretely, a space **is** its `DatabaseDirectory` root automerge document plus the set of linked per-object documents it indexes. `DatabaseDirectory.getSpaceId` (`document-structure.ts:109-121`) recovers the owning `SpaceId` from the doc itself. `SpaceProxy` (`packages/sdk/client/src/echo/space-proxy.ts:100`) is the client-side implementation, wiring into HALO credential types.

"Epochs" (`space-proxy.ts:47-59`; `packages/sdk/client-services/src/packlets/spaces/data-space.ts`) are compaction/migration checkpoints — re-baselining a space's automerge history (e.g. after schema migration).

## 3. Schema system

Modern schema lives in `@dxos/echo` (`packages/core/echo/echo/src`); wire/persisted shape in `echo-protocol`; runtime registration in `echo-client`.

**Type definition** — `Type.makeObject` (`packages/core/echo/echo/src/Type.ts:137-144`):

```ts
export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({ name: Schema.String }),
) {}
```

Relations use `Type.makeRelation<Self>(dxn)({ source, target })(schema)`. Both build directly on `effect/Schema` — there is no separate DXOS schema DSL; ECHO types are ordinary Effect Schemas carrying custom annotations. `EchoObjectSchema` (`internal/Entity/object.ts:30-86`) stamps the `id` field and `TypeAnnotationId` onto the struct.

**Runtime registry** — `Registry.Registry` (`Registry.ts:43-114`, "wired one per space"), concrete `RegistryImpl` (`echo-client/src/registry/registry.ts:29`), in-memory keyed by id + URI with optional upstream chaining. `db.addType()` (`proxy-db/database.ts:504-520`) persists a type, deduping on `(typename, version)`.

**Dynamic/stored schema** — `TypeSchema` (`internal/Type/type-schema.ts:23-38`) is a schema-as-data record (`{ name?, jsonSchema }`) persisted as an ordinary ECHO object. `_addPersistentSchema` (`database.ts:405-446`) converts static or raw Effect Schemas into this stored form; `toEffectSchema` (`json-schema.ts:219`) rebuilds a real `Schema.Schema` lazily, so dynamic and static schemas satisfy the identical `Type<A>` interface.

**Versioning/migration** — every type carries `typename` + semver `version` via `TypeMeta` (`annotations.ts:101-104`), stored per-object in `EntityMeta.key`/`version` (`document-structure.ts:349-358`). Explicit migrations via `Migration.define({ from, to, transform, onMigration })` (`Migration.ts:92-114`) — no automatic schema-diffing. Draft schemas default to `DRAFT_VERSION` and are disambiguated by automerge heads (`Type.ts:479-500`) — a schema's practical version can be `0.1.0-<automerge-heads-suffix>`.

**Annotations** (`internal/Annotation/annotations.ts`): `TypeAnnotationId` (typename/version/kind/relation endpoints, 111-133), `ReferenceAnnotationId` (275-277), `PropertyMetaAnnotationId` (233-259), UI-facing `LabelAnnotationId`, `IconAnnotationId`, `HiddenAnnotationId`, form-layout annotations (288-465).

**Doc mapping** — the type field is `EntityStructure.system.type: EncodedReference` (`document-structure.ts:198-208, 373-392`), holding the schema's DXN (e.g. `dxn:org.example.Person:1.0.0`). User data lives under `EntityStructure.data` ("Adheres to schema in `system.type`").

## 4. Refs / DXN

Two branded URI schemes under a common `URI` base (`packages/common/keys/src/URI.ts`):

- **`dxn:`** — names a _resource/type_ (schema, plugin, capability): `dxn:<nsid>[:<version>]` (`DXN.ts:31`, grammar at `DXN.ts:16-17`).
- **`echo:`** (EID) — addresses an _object or space instance_ (`EID.ts:48`): `echo://<spaceId>/<objectId>`, `echo://<spaceId>`, or local `echo:///<objectId>`.

**Reference storage** is an IPLD-style link marker, `EncodedReference` (`echo-protocol/src/reference.ts:14-16`): `{ '/': URI.URI }`. The `Ref<T>` object (`internal/Ref/ref.ts:171-254`, impl at `ref.ts:493`) wraps an `echo:` or `dxn:` URI, encoding via the Effect Schema layer itself (`createEchoReferenceSchema`, `ref.ts:328-365`) — decoding a reference field calls `db.makeRef(uri)` to attach a live resolver.

**Resolution** is tiered: `RefResolverRequest` (`ref.ts:410-437`) models `working-set` (sync) → `disk` → `network` ceilings. `RefImpl.target` is a synchronous, reactive getter; `load()`/`tryLoad()` are async. Cross-space resolution is asymmetric (`HypergraphImpl`, `echo-client/src/hypergraph.ts`): the sync path (`_resolveSync`, `hypergraph.ts:512-556`) can resolve into any already-loaded space; the async/network path (`_resolveAsync`, `hypergraph.ts:558-632`) throws `'Cross-space references are not yet supported'` (573-576) for anything not already local — cross-space refs work opportunistically, not as a first-class network feature.

## 5. Queries & reactivity

**Query API**: `Filter` (`Filter.ts:27-58`) and `Query` (`Query.ts:64-70`) are AST-builder classes; entry point `db.query(...)` → `QueryResult` with `.subscribe()`/`.run()`.

**Indexing**: `packages/core/echo/index-core` is a SQLite-backed indexing engine (`@effect/sql`) with pluggable `Index` implementations — `FtsIndex` (full-text), `ReverseRefIndex` (outgoing `{'/': ...}` refs per object), `EntityMetaIndex` (`index-engine.ts:14-25`). Live in-process queries bypass the index and scan the working set (`SpaceQuerySource` with `noIndexes: true`, `graph-query-context.ts:201`); the SQL/FTS index serves the remote `QueryService` path (full-text, cross-space, large corpora).

**Reactivity**: no longer `@preact/signals-core` — DXOS moved to `@effect-atom/atom`. Mutable ECHO objects are Proxy-wrapped and emit through an event; `Obj.subscribe` (`internal/common/proxy/reactive.ts:16-31`) hooks it, and atom families (`internal/Obj/atoms.ts:43-54`) recompute snapshots on mutation for `useAtomValue` rendering.

**React hooks** (`packages/core/echo/echo-react`): `useQuery` (`useQuery.ts:38-68`, on `useSyncExternalStore`), `useObject` (`useObject.ts:22-156`, overloaded for object / `Ref<T>` / property key), `useSchema`.

## 6. Replication/sync topology (Subduction, EDGE, MESH)

**SubductionPolicy** (see the `subduction` skill) is a client-side authorization layer with four hooks — `authorizeConnect`, `authorizeFetch`, `authorizePut`, `filterAuthorizedFetch` — consulted by the Rust/Wasm Subduction transport; a capability stock automerge-repo does not have. In `automerge-host.ts` (with `useSubduction: true`) the `Repo` is constructed with `subductionPolicy` and `subductionAdapters` (~284-302); `authorizeConnect` is currently allow-all, `authorizeFetch`/`filterAuthorizedFetch` delegate to `EchoNetworkAdapter.shouldAdvertise`, and `authorizePut` is deliberately allow-all (denying it would deadlock invitation bootstrapping). The older classical `shareConfig.access`/`announce` predicates (`automerge-host.ts:664-698`) are **not** consulted by Subduction (comment at 661) but converge on the same `shouldAdvertise` predicate.

**EDGE** (`echo-edge-replicator.ts`, `echo-edge-subduction-replicator.ts`) is the hosted cloud sync service, over WebSocket (`edge-ws-connection.ts:136-147`), running classical sync frames or the Subduction byte-tunnel.

**MESH** (`mesh-echo-replicator.ts`) is peer-to-peer via `@dxos/teleport-extension-automerge-replicator` (WebRTC/teleport), authorizing by HALO device key (`_authorizedDevices: Map<SpaceId, ComplexSet<PublicKey>>`).

Both implement the same `AutomergeReplicator` interface (`echo-replicator.ts:30-65`) feeding a single `EchoNetworkAdapter`, so one `Repo` can be backed interchangeably by EDGE, MESH, or in-memory adapters.

**Vs. vanilla automerge-repo**: structurally the same core — one `Repo`, pluggable network/storage adapters — plus two authorization layers stock automerge-repo lacks: (a) `shareConfig` predicates wired to HALO membership, and (b) the four-hook `SubductionPolicy` for the Subduction transport. Not a different sync model; automerge-repo/Subduction plus an authorization shim mapping peers/documents onto HALO space membership and device keys.

## 7. Identity / HALO

HALO packages: `packages/core/halo/*` (Effect-based capability layer) plus runtime implementation in `packages/sdk/client-services/src/packlets/{identity,devices,invitations,space}`.

**Identity** (`identity.ts:38-99`) = Ed25519 `identityKey` + `deviceKey` pair, a `did: IdentityDid`, a `Signer`, and its own genesis-based HALO feed-space; keys minted via a `Keyring`.

**Device management**: `Identity.admitDevice()` (`identity.ts:199-244`) issues an `AuthorizedDevice` credential plus `AdmittedFeed` credentials (CONTROL/DATA); `DeviceStateMachine` replays these to track `authorizedDeviceKeys`.

**Space membership/invitations**: `space-invitation-protocol.ts` — host `admit()` issues a `SpaceMember` credential; guest validates `assertion['@type'] === 'dxos.halo.credentials.SpaceMember'` and accepts the space.

**Credentials**: `credential-factory.ts` defines a verifiable-credential-like structure (`{ issuer, subject: { id, assertion }, parentCredentialIds, proof: { signer, value, chain? } }`), with cryptographically verified delegation chains (`verifyChain`, `verifier.ts:66`). automerge-repo ships nothing comparable — bare `PeerId` strings and an optional boolean share-policy callback.

## 8. Version history / branching

ECHO exposes real automerge history natively, and Composer surfaces it:

- `getEditHistory(object)` (`echo-client/src/echo-handler/edit-history.ts:22-29`) calls `A.getHistory(doc)` directly.
- `getEditHistoryWithDiffs` (`edit-history.ts:63-119`) replays changes and computes per-version add/remove magnitudes via `A.diff` for timeline visualization.
- `checkoutVersion`/`checkoutVersionSnapshot` (`edit-history.ts:126-171`) use `A.view(doc, heads)` to reconstruct historical states as immutable `Obj.Snapshot`s.
- **Real branching**: `DatabaseDirectory.branches: SpaceBranchRegistry` (`document-structure.ts:60-89`) — "the single synced source of truth for branches" — keyed by subtree-root object id → branch name → `{ members: {objectId: docUrl}, baseHeads, createdAt }`.
- `forkDump` (`core-db/branching.ts:36-66`) forks a document by walking the automerge change-dependency graph and replaying reachable changes into a new doc, preserving ancestry so a later `A.merge` is "a true CRDT 3-way merge rather than an unrelated 'two roots' conflict."
- Current-branch selection is deliberately **not synced** — device-local (`createDeviceLocalBranchStore`, `packages/sdk/client/src/echo/branch-store.ts`), backed by `localStorage`.
- UI: `packages/plugins/plugin-versioning` (`ObjectHistory.tsx`) renders a git-graph-style `Timeline` of checkpoints/forks/merges per object, gated per-type via a `HistoryProvider` capability, with time-travel and branch switching.

## 9. Interop surface — is the automerge doc format proprietary?

The underlying bytes are ordinary automerge documents (loadable by any `@automerge/automerge` client), and rich-text fields are genuine automerge Text/RichText CRDT values — confirmed by `packages/plugins/plugin-markdown/src/operations/{accept-change,reject-change,restore-text}.ts`, which import `next as A from '@automerge/automerge'` and operate on raw automerge history independent of DXOS schema machinery.

However, the **document shape layered on top is DXOS-specific**: the space root is a `DatabaseDirectory` (`objects`/`links`/`branches`/`access`), each object an `EntityStructure` with a `system` sub-object (`kind`, `type: {'/': dxn}`, `parent`, `source`/`target`) plus a `data` namespace. References are IPLD-style `{'/': uri}` markers using `echo:`/`dxn:` URIs, not automerge-repo's `AutomergeUrl` convention. A generic automerge-repo consumer could load and edit the raw doc but would not see ECHO's type system, references, or the space's per-object-doc index without re-implementing `DatabaseDirectory`/`EntityStructure`/`EncodedReference` parsing — technically automerge-compatible at the byte/doc level, semantically a private schema on top (comparable in spirit to Patchwork's own `@patchwork` conventions).

## 10. Mandatory vs. optional — could ECHO's schema/query layer run on vanilla automerge-repo?

Evidence for separability: `EchoTestBuilder`/`EchoHost` (`echo-client/src/testing/echo-test-builder.ts:50,171`) spins up the full `EchoHost` + `AutomergeHost` + `HypergraphImpl`/`DatabaseImpl` stack in tests with **no HALO identity, device, or credential layer at all** — `useSubduction`, `SubductionPolicy`, and HALO are independently optional flags/services.

- **Mandatory to the data model**: the `DatabaseDirectory`/`EntityStructure`/`EncodedReference` conventions, the `Registry`/`Type.makeObject` schema layer, `Ref`/DXN, and the query/index layer — all sitting purely on a `Repo` + `StorageAdapter` with no structural HALO dependency. In principle this layer could be pointed at any automerge-repo-compatible `Repo`; DXOS's own `SqliteStorageAdapter` and `EchoNetworkAdapter` are standard `StorageAdapterInterface`/`NetworkAdapter` implementations.
- **Optional/pluggable**: HALO identity/credentials, `SubductionPolicy`, and the EDGE/MESH replicator choice.
- **Where production couples them**: `SpaceProxy`/`DataSpaceManager` (client / client-services layer, not echo-client/echo-host) wire spaces to HALO credentials for membership, invitations, and replication authorization. That coupling lives one layer above the ECHO data engine.

**Bottom line**: ECHO's schema, query, and doc-structuring logic is a genuinely separable layer that could run against a vanilla automerge-repo `Repo` (as DXOS's own tests do). What is effectively inseparable is the `DatabaseDirectory` root-doc convention (spaces need the manifest to know which per-object doc holds what), and production-grade access control requires either HALO credentials or a `SubductionPolicy` — automerge-repo alone provides neither.
