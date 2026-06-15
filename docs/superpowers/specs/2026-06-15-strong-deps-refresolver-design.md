# Strong Dependencies via RefResolver — Design

Date: 2026-06-15
Status: Design — approved in session, not yet planned/implemented.
Packages: `@dxos/echo` (`RefResolver`, `Ref`), `@dxos/echo-client` (`HypergraphImpl`, `CoreDatabase`, `ObjectCore`, `echo-handler`), `@dxos/echo` `json-serializer`.

## Problem

A loaded entity's **strong dependencies** must be synchronously present in the working set, so
synchronous read APIs work without async. Strong deps today are: schema-as-object (`type`), relation
`source` / `target`, and `parent`. The relation read path relies on this — `_getRelationSource` /
`_getRelationTarget` call `RefResolver.resolveSync(uri, /* load */ false)` and assert a hit; queries
enforce the invariant by not surfacing an object until `areStrongDepsSatisfied` is true.

Two layers participate, but only one is general:

- The **read** path already goes through `RefResolver` (`echo-handler` →
  `graph.createRefResolver().resolveSync`), which can reach local-db / cross-space / queue / registry
  entities.
- The **preload + satisfaction** path (`CoreDatabase`) is hard-wired to the same-space Automerge doc
  loader: `_strongDepsIndex`, `_areDepsSatisfied`, the `_objects` map,
  `_automergeDocLoader.loadObjectDocument`, `_unavailableObjects`. It explicitly skips any dep where
  `!EID.isLocal(dep)`.

**Consequence.** Feed/queue objects (resolved via `QueueFactory`, not the Automerge directory),
cross-space objects, and registry types (DXN-form) can be _read_ through the resolver but can never
be _satisfied_ as strong deps. So a relation cannot safely point its `source` / `target` at a feed
object or an object in another space, because the query layer would surface the relation before the
endpoint is in the working set, breaking the synchronous `resolveSync(..., false)` assertion.

A second constraint cuts across this: **the resolver does not distinguish disk-load from
network-load.** A recursive strong-dep load must never block the query pipeline on the network
(today encoded ad-hoc as the `diskOnly` option inside `CoreDatabase`); an explicit `ref.load()`
should be allowed to escalate to the network.

## Goals

- Express strong-dependency preloading and satisfaction in terms of `RefResolver`, so it spans
  spaces / queues / registry uniformly.
- Allow **feed (queue) objects** as relation `source` / `target` endpoints.
- Allow **cross-space relations**.
- Allow a **registry `Type`** (DXN-addressed) to be a strong dep.
- Give the resolver a first-class **load-source ceiling** (`working-set` / `disk` / `network`) so
  strong-dep preloads stay disk-bound and never stall the query pipeline.

## Non-goals

- Changing the relation **write/create** invariant: creating a relation still requires live
  `source` / `target` objects (a live queue object for a feed endpoint). Only the load/surface path
  changes.
- A general distributed GC / reference-counting redesign. `abort()` refcounting is scoped to
  in-flight resolution ops.

## Design

### 1. RefResolver API

Replace the four-method resolver surface (`resolveSync` / `resolve` / `resolveSchema` /
`resolveType`) with a single request-returning method plus a stateful handle:

```ts
type RefSource = 'working-set' | 'disk' | 'network';

interface RefResolver {
  // `source` is a required ceiling; cheaper tiers are always probed first.
  resolve(uri: URI.URI, options: { source: RefSource }): RefResolverRequest;
}

interface RefResolverRequest {
  readonly state: 'pending' | 'requesting' | 'ready' | 'unavailable';
  readonly stateChanged: Event<void>; // @dxos/async Event
  getResult(): Entity.Unknown | undefined; // sync snapshot; defined iff state === 'ready'
  wait(): Promise<Entity.Unknown | undefined>; // settles when state ∈ {ready, unavailable}
  abort(): void; // refcount-- on the shared op (see Coalescing)
}
```

- **`source` is a ceiling.** Each tier always probes the cheaper ones first:
  - `working-set` — sync, in-memory only. A miss settles `unavailable` immediately. This is the
    `resolveSync` replacement: `resolve(uri, { source: 'working-set' }).getResult()`.
  - `disk` — probe working-set, then local storage; never the network. This is today's `diskOnly`,
    and what recursive strong-dep preloads use.
  - `network` — probe working-set, disk, then fetch from peers. This is what an explicit
    `ref.load()` uses.
  - `unavailable` is always **relative to the requested ceiling** (disk-unavailable ≠
    network-unavailable).
- **Transitions.** `pending` is a one-way **entry** state; `requesting → pending` is **disallowed**
  at the API level, so a consumer can treat "left `pending`" as permanent. Legal edges:
  - `pending → requesting` (op starts; a `working-set` request skips this and settles synchronously);
  - `requesting → ready`; `requesting → unavailable`;
  - `unavailable → requesting` (recovery: a dep/body later arrives from a peer, or the ceiling is
    escalated);
  - `ready → requesting`/`unavailable` (regression only when a closure member regresses — e.g. a dep
    doc is evicted/deleted; reactive-correctness edge, not the common path).
    We do **not** claim global monotonicity (a `network` request can depend on an on-disk object whose
    state moves), only that `pending` is never re-entered.
- **`ready` means FULLY USABLE** — the entity's own body **and** its strong-dep closure are
  materialized (see §2). The body-vs-closure split is internal; `requesting` transparently covers "a
  dep is still loading." This matches today's async-resolve behavior (it already routes through the
  query pipeline, which gates on satisfaction), so `ref.load()` and relation endpoints come back
  usable.
- **Schema / type fold in.** A type ref resolves to a `Type` entity via the registry/db backends;
  schema is `Type.getSchema(request.getResult())`. `json-serializer` switches from
  `resolveSchema` / `resolveType` / `resolve` to `resolve(uri, { source: 'network' }).wait()` (+
  `Type.getSchema` where a schema is wanted).
- **Cross-space enabled.** The current `_resolveAsync` guard that throws
  `'Cross-space references are not yet supported'` is removed; an absolute `echo:` EID with a foreign
  `spaceId` routes to that space's backend.

#### Backends

`HypergraphImpl` owns a set of resolution backends, selected by URI kind / space:

- **echo-db backend** (per space) — wraps the existing Automerge doc-loader `pending → requesting →
ready/unavailable` body machine.
- **queue backend** (per space) — wraps `QueueFactory` / `queue.getObjectsById`, mapping its
  cached / local / remote tiers onto the `source` ceiling.
- **registry backend** — in-memory; effectively `working-set`.

`createRefResolver(context)` stays as the façade that routes a `uri` to the right backend using
`context.space` / `context.feed`.

#### Coalescing

Requests are **cheap, un-coalesced per-call handles**; dedup lives **below** the resolver. Each
backend keeps one in-flight **op** per URI (tracking the body tier). `resolve()` mints a fresh
`RefResolverRequest` attached to that op; the op drives `stateChanged` on all its handles; `abort()`
decrements the op's refcount and cancels the underlying IO only at zero.

`stateChanged` must not be emitted **synchronously within** the `resolve()` call (defer to a
microtask) to avoid re-entrant listener storms during closure discovery.

### 2. Two layers: load op (body tier) vs closure satisfaction

To stay cycle-safe (strong deps form cycles: `A.source→B, B.parent→A`; mutually-citing relations;
self-referential types), the model keeps two distinct notions and **never lets a node's readiness
depend recursively on another node's readiness**:

- **Load op** (per-URI, in a backend; the `LoadOp` of §6): materialization of _one_ entity's bytes, `pending →
requesting → ready/unavailable`. Cycle-free by construction; it never inspects deps.
- **Closure satisfaction** (cycle-aware): a BFS over the strong-dep graph, guarded by a `seen` set,
  asserting that **every reachable node's load op** is `ready`. The walker waits on member **bodies**,
  not on their closure-readiness — so `A ↔ B` cannot deadlock: both bodies load independently, and
  once both bytes are in, both closures evaluate satisfied in the same pass. A cycle yields a finite
  `seen`-bounded set.

A public `RefResolverRequest`'s `state` is derived: `unavailable` if the root or any closure-member
body is `unavailable` (at the ceiling); `ready` when the root body + the whole closure are body-ready;
otherwise `requesting` / `pending`. `stateChanged` fires when the root op or any closure-member op
changes.

**All graph-walking lives in `HypergraphImpl`, not `ObjectCore`.** The walker (owned by the
resolver) owns the BFS, the `seen` set, body-op waiting, and the closure-satisfaction predicate.
`ObjectCore` (via the store-agnostic extractor, §3) only answers "what are _my_ direct strong deps?"
— it contributes edges, never traverses. The old `CoreDatabase._areDepsSatisfied` recursion (which
carried its own `seen`) is removed, not relocated into `ObjectCore`. The walker needs the strong deps
of an **arbitrary resolved entity**, not just an `ObjectCore`.

### 3. Strong-dependency computation

- **Dep identity becomes a URI.** `getStrongDependencies()` returns `URI.URI[]` (was `EID.EID[]`):
  cross-space `echo:` EIDs, queue-item EIDs, and `dxn:` registry type URIs all included. The
  `EID.isLocal` filtering and the four `!EID.isLocal(dep) → continue` guards in `CoreDatabase` are
  deleted.
- **Store-agnostic extraction.** The logic that reads `type` / relation `source`+`target` / `parent`
  off an entity moves into a function over an entity (or its snapshot) usable for queue items and
  cross-space objects, with `ObjectCore.getStrongDependencies()` delegating to it.

### 4. CoreDatabase integration

- `CoreDatabase` gets a **`RefResolver` injected** from its owning `DatabaseImpl.graph`.
- Surfacing collapses to a single closure-aware request: after materializing object `A`'s body,
  `CoreDatabase` issues `resolver.resolve(aUri, { source: 'disk' })`. Because `A`'s body is already in
  the working set, the request's job is to walk + satisfy `A`'s closure; its `ready` **is** the
  surface gate. `CoreDatabase` holds the request and subscribes to `stateChanged` →
  `_scheduleThrottledUpdate([A.id])`.
- **`loadObjectCoreById`** becomes a thin wrapper: resolve the object's body, then return the core
  when the closure-aware request reaches `ready`; return `undefined` when the body is unreachable or
  the request settles `unavailable`; `returnWithUnsatisfiedDeps: true` still returns the partial
  core. The `diskOnly` option is replaced by the request's fixed `source: 'disk'`.
- **Retired:** `_strongDepsIndex`, `_unavailableObjects`, `_onObjectUnavailable`'s BFS, and the
  dep-loading branch of `_onObjectDocumentLoaded`. Transitive waking and "unavailable" now fall out
  of the request state machine + walker.

### 5. Read-path integration

- **Relation `source` / `target`** (`_getRelationSource` / `_getRelationTarget`) keep their shape but
  use `resolve(uri, { source: 'working-set' }).getResult()`. Because endpoints are strong deps
  preloaded to `ready`, the working-set probe succeeds synchronously even for feed / cross-space
  endpoints. A working-set miss may additionally subscribe via `stateChanged` for reactive re-render.
- **`isDeleted`** parent walk stays sync via the working-set probe (parent is a strong dep, hence
  loaded).
- **`RefImpl` keeps a single lazily-created request.** On the first `.target` / `.load()` /
  `.tryLoad()` access it creates **one** `resolve(uri, { source: 'network' })` and stores it;
  subsequent accesses reuse it. `.target` returns `request.getResult()` (the request keeps
  progressing in the background); `.load()` / `.tryLoad()` return `request.wait()`. The existing
  `Ref.#resolved` event is driven by subscribing to the request's `stateChanged`. No separate
  working-set-probe + background-kick pair.
  - **Resource safety.** ECHO proxies mint a fresh `RefImpl` per property access, so the request is
    created **lazily** (refs traversed but never resolved cost nothing) and shared via the body-op
    cache (§6 — one IO per URI regardless of how many `RefImpl`s point at it). A
    `FinalizationRegistry` calls `request.abort()` when a `RefImpl` is GC'd, since refs have no
    explicit dispose.
  - **Semantic deltas (intentional).** `.target` now (a) triggers a lazy **network** load on first
    access (true lazy-ref loading; today's `resolveSync` does not actually load), and (b) is gated on
    **closure-ready** like every other surfaced entity, so a half-usable object is never observed.

### 6. Internal resolver state (HypergraphImpl)

Two cooperating structures: shared **load ops** (coalesced, per-URI, body tier only) and per-call
**requests** (un-coalesced, closure-aware). All of it lives in `HypergraphImpl`; backends are the
existing `_databases` (echo-db doc loaders), `_queueFactories`, and `_registry`.

#### Load ops — coalesced loading

```ts
#loadOps: Map<URI.URI, LoadOp>;

interface LoadOp {
  readonly uri: URI.URI;
  maxCeiling: RefSource;                                   // highest ceiling currently pursued
  state: 'pending' | 'requesting' | 'ready' | 'unavailable'; // BODY tier only, never closure
  result: Entity.Unknown | null;                          // held object; non-null iff state === 'ready'
  readonly changed: Event<void>;                           // fires on state/result change
  refcount: number;                                        // live requests referencing this op
  cancel?: () => void;                                     // backend IO cancellation
}
```

- Created lazily on first reference; routed to a backend by URI kind / space. The backend drives
  `state` / `result` and emits `changed`. `working-set` performs a synchronous probe only (no IO).
- **Escalation, not regression of ceiling.** A reference at a higher ceiling than `op.maxCeiling`
  re-invokes the backend at the higher ceiling (`unavailable → requesting` is legal); the ceiling is
  never lowered, and `state` never returns to `pending`.
- **Refcount → 0** cancels IO and drops the op. Dropping an op does **not** evict the entity (it
  remains in the backing store's working set); the op only tracks progress.
- Subsumes today's `_resolveEvents` cross-client appearance map and the `_automergeDocLoader`
  pending/requesting/unavailable signals.

#### Requests — closure-aware handles

Each `resolve()` returns a `RequestImpl` referencing the root URI's load op and tracking the closure:

```ts
interface RequestImpl {
  readonly root: LoadOp;
  readonly source: RefSource;
  readonly members: Map<URI.URI, { op: LoadOp; unsub: () => void }>; // root + discovered closure
  state: RefResolverRequest['state'];
  readonly stateChanged: Event<void>;
}
```

- On any member's `changed`: re-walk the closure from `root.result` using the store-agnostic
  strong-dep extractor (§3), guarded by `seen`; attach load ops (incrementing refcount) for
  newly-discovered dep URIs at the same ceiling; recompute the public `state`:
  - `unavailable` if the root or any member body is `unavailable`;
  - `ready` if the root and all member bodies are `ready`;
  - else `requesting` / `pending`.
    Emit `stateChanged` only on change, **deferred to a microtask** (avoids re-entrant listener storms
    mid-walk).
- `getResult()` returns `root.result` iff `state === 'ready'`.
- `wait()` resolves when `state ∈ {ready, unavailable}`.
- `abort()` unsubscribes every member and decrements each member op's refcount.
- Requests are intentionally **not** coalesced (cheap handles); the expensive IO is shared at the
  `LoadOp` layer. The closure walk itself is an in-memory BFS over already-materialized bodies.

#### Edge cache (optional optimization)

```ts
#depEdges: Map<URI.URI, URI.URI[] /* direct strong-dep uris */>;
```

Filled by the extractor when a body becomes `ready`, invalidated on that body's `changed`. Saves
recomputing direct edges across overlapping closures; not required for correctness.

### 7. Folded-in cleanup: remove `RefResolverOptions.middleware`

`RefResolverOptions.middleware` (`@dxos/echo` `Hypergraph.ts`, marked `@deprecated On track to be
removed`) has exactly one consumer: `echo-handler.lookupRef` passes
`middleware: (obj) => this._handleStoredSchema(target, obj)` (`echo-handler.ts:967`, and the
`linkCache` branch at `:977`). `_handleStoredSchema` canonicalizes a **persisted** (db-backed) stored
schema — `isInstanceOf(TypeSchema, object) && Type.getDatabase(object) != null` — into its registered
`Type.Type` entity via `database._getOrRegisterPersistentSchema(object)`; everything else passes
through unchanged.

As part of this work, **remove `middleware`** and move that canonicalization into the resolver's
**echo-db backend** (or `DatabaseImpl`), so a resolved persisted stored schema is canonicalized at
resolution time for _all_ callers rather than through a caller-supplied hook. `lookupRef` then just
sets the standard resolver with no per-call middleware, and `RefResolverOptions` collapses to
`{ context? }`. The `createRefResolver` JSDoc `// TODO(dmaretskyi): Restructure API: Remove
middleware.` is resolved by this change.

## Enabled capabilities

- Feed/queue objects as relation `source` / `target`.
- Cross-space relations.
- Registry `Type` as a strong dep (the `dxn:` dep resolves through the registry backend at
  `working-set`).

## Migration (one change, no compat shims)

Update every `RefResolver` caller to the new surface: `RefImpl` (`@dxos/echo`), `echo-handler`
relation read path, `json-serializer` (`resolveSchema` / `resolveType` / `resolve`), `Database.ts`,
`devtools`, the `StaticRefResolver` test impl, and `HypergraphImpl` itself.

## Testing

- Translate `strong-deps-stall.test.ts` to the new model (unreachable dep, unreachable transitive
  dep, query completes & excludes objects with unavailable strong deps, locally-persisted object
  clears a stale probe, directory-absent dep settles `unavailable`).
- New suites:
  1. a relation with a **feed-object** endpoint surfaced by a query;
  2. a **cross-space** relation;
  3. a **registry-type** strong dep;
  4. **cycle** safety (`A ↔ B` via parent/source) — both surface, no deadlock;
  5. `abort()` / refcount on shared ops;
  6. `source` ceiling behavior (disk-unavailable vs network-available).

## Risks / open considerations

- **Walker re-entrancy.** Discovery recursion must consult the op-cache + `seen` _before_ recursing,
  and `stateChanged` must be deferred (microtask), or closure discovery can re-enter listeners
  mid-pass.
- **Strong-dep extraction for non-`ObjectCore` entities.** Queue items and cross-space objects must
  expose `type` / `source` / `target` / `parent` in a form the extractor can read without binding to
  a `CoreDatabase`.
- **`ready` couples the resolver to strong-dep policy** (it must compute `getStrongDependencies`).
  Accepted in session as the cost of `ref.load()` returning usable entities.
