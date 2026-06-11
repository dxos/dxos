# ECHO-DB Large-Scale Refactor — Goals

High-level goals only. Detailed execution plan to follow in `PLAN.md`.

## Prime directive

**No public API changes. No observable behavior changes.** The full test suite must pass
before and after every stage of the refactor. This is a pure internal restructuring of
`@dxos/echo-db` (with limited, behavior-preserving touches in `echo-pipeline`).

Sanctioned exceptions (surface changes with no behavior change):

- Deprecating `getObjectById` on the user-facing surface (G8).
- Replacing external reach-ins to `coreDatabase` internals with named API methods on the
  database class, migrating those consumers in the same change (G1).
- Renaming the `EchoDatabaseImpl` class to `DatabaseImpl` (internal-facing export; all
  call sites updated, no compat alias left behind).
- Renaming the packages: `@dxos/echo-db` → `@dxos/echo-client`,
  `@dxos/echo-pipeline` → `@dxos/echo-host` (G12).
- Hiding `ObjectCore` / `getObjectCore` from the public barrel, migrating the few
  external consumers to sanctioned APIs (G12).

All sanctioned surface changes are **frontloaded**: they land first, so every later stage
is purely internal.

## Motivation

The package has accreted three parallel state machines and two parallel object models:

1. The space database is split across `EchoDatabaseImpl` (proxy facade), `CoreDatabase`
   (object collection + dep tracking), and `AutomergeDocumentLoader` (doc handle lifecycle)
   with the wrong abstraction boundaries — `CoreDatabase` and the loader communicate via
   events and ~9 cross-referenced maps/sets, and the loader interface has exactly one
   implementation and zero external consumers.
2. Per-object state is split between `ObjectCore` (storage/Automerge layer) and
   `ObjectInternals` (proxy metadata layer), which both independently track
   database-attachment and overlap on lifecycle concerns (`linkCache`, schema caching).
3. An object's loading lifecycle ("not yet requested" → "loading from disk" → "requesting
   from network" → "unavailable" → "loaded") is not represented anywhere as a state — it is
   implied by membership in maps spread across `CoreDatabase`, `AutomergeDocumentLoader`,
   and `ObjectCore`. This made the strong-deps load path brittle (see the recent
   index-query stall fix) and makes every new loading feature a cross-class change.
4. `echo-handler.ts` is a 1.5k-line module mixing proxy traps, array ops, schema/type
   resolution, ref resolution, validation, lifecycle, and devtools concerns.
5. `queue/` is mid-migration to Feed (phases 1–4 of `plans/queue-to-feed-migration/` are
   done); it carries deprecated-but-implemented methods, an unfinished stub, queue/feed
   naming inconsistencies, and API-shaped classes that are now internal.
6. `GraphQueryContext` is a generic N-source aggregator, but in practice the registry
   source is opt-in (explicit scope) and never merges with others; the only real
   aggregation is working-set + index union — and its cross-source dedup is an
   unimplemented TODO.
7. The client working-set query path and the host `QueryExecutor` are entirely separate
   evaluation engines, though they already share the filter-matching primitives
   (which are themselves ~60% duplicated between the doc-shaped and JSON-shaped variants).

## Goals

### G1 — One entity manager per space database

Collapse `CoreDatabase` + `AutomergeDocumentLoader` (and the internals of
`EchoDatabaseImpl`) into a single **entity-manager** that owns the object collection,
document loading, and root-doc/space state. `EchoDatabaseImpl` — renamed **`DatabaseImpl`**
— survives as a separate thin user-facing API class implementing the existing `Database`
interface.

External reach-ins into core-database internals are killed, not preserved: devtools,
cli-util, observability, and the functions runtime currently call through
`db.coreDatabase.*` (sync state, object ids, `_repo`, `_automergeDocLoader`). Each such
use gets a named API method on `DatabaseImpl` (e.g. sync-state subscription, object-id
enumeration, a migration-scoped repo accessor), and every consumer is migrated in the
same change — no compat shims, and the `coreDatabase` accessor goes away with the class
it exposes.

### G2 — One entity core per object, with explicit lifecycle states

Merge `ObjectCore` + `ObjectInternals` into a single **entity-core** that is expressive in
its states rather than encoding them via optional fields and external map membership:

- `detached` — live object, no database
- `loading` — requested, probing disk
- `requesting` — not on disk, waiting on network
- `unavailable` — disk probe negative, network not (yet) delivering (background wait)
- `attached` — bound to a live document

The pre-object pending state currently tracked in `AutomergeDocumentLoader`
(`_objectsPendingDocumentLoad`, `_currentlyLoadingObjects`) and `CoreDatabase`
(`_unavailableObjects`, parts of `_strongDepsIndex` bookkeeping) is collocated on the
entity-core.

Entity-cores reference each other **directly** — in particular, strong dependencies are
held as references to the dependency's entity-core (in whatever state it is in), replacing
today's string-keyed reverse index (`_strongDepsIndex: Map<DXN, EntityId[]>`) and the
recursive `_areDepsSatisfied`/`_areDepsResolved` map walks. Dep resolution then reads as
"are my referenced cores in a resolved state", and shell cores (G2 states above) give
every dependency an addressable identity from the moment it is first referenced.

State changes are published on an **entity-core state-change event bus** owned by the
entity-manager (core created, state transition, dep resolved), replacing the current
choreography of `onObjectDocumentLoaded`/`onObjectUnavailable` loader events plus the
coarse `_updateEvent` that waiters poll with predicates. Queries, `loadObjectCoreById`
waiters, and dep propagation all subscribe to the same bus.

**Proxy tracking moves onto entity-core.** Core : root-proxy is asserted 1:1 — production
already guarantees this via the `_rootProxies` defaultMap on the database; the only
core-aliasing case is a synthetic test. The map is deleted and the entity-core holds its
root proxy directly. The `linkCache` (refs created while detached, flushed on attach)
collapses into the same mechanism as strong deps: references to other entity-cores, held
by a core in `detached` state.

Note: core → _document_ rebinding stays — it is exercised in production by document
fragmentation (`_rebindObjects`: objects moving between automerge docs). An `attached`
entity-core must support swapping its doc handle; only core → _proxy_ multiplicity is
eliminated.

### G3 — Decompose echo-handler

Split `echo-handler.ts` into cohesive modules (proxy traps, array handling, schema/type
resolution, ref/link resolution, validation/encoding, lifecycle/creation, devtools) with
no change to proxy behavior. The primary split is the seam defined by G9: domain logic
moves down to entity-core, traps stay in the handler. Unification with `@dxos/echo`'s
`typed-handler` is explicitly out of scope (future work).

### G4 — Finish the queue → feed internal cleanup

Align with and advance `plans/queue-to-feed-migration/`: remove dead code (e.g. the
throwing `MemoryQueue.query`), fix internal queue/feed naming inconsistencies, and demote
API-shaped internals — without touching the still-public surface (`Space.queues`,
`QueueFactory` via client-protocol, the `FeedProtocol.QueueService` RPC layer), which is
phase 5/6 of that plan and out of scope here.

### G5 — Query aggregation reduced to what it actually does

Replace the generic N-source aggregation in `GraphQueryContext` with the two real cases,
stated explicitly: (a) route registry-scoped queries to the registry source; (b) union
working-set results with index results for space queries — with deliberate, implemented
by-id deduplication semantics instead of today's TODO. Keep the `QueryResult` /
`QueryContext` separation, which works well.

### G6 — Converge client and host query evaluation

Move toward one planner + executor pattern across the working-set path and the host
`QueryExecutor`, in increasing order of ambition:

1. Unify the duplicated filter-matching implementations (`filterMatchObject` /
   `filterMatchObjectJSON`) behind one record representation.
2. Reuse the host's `QueryPlanner` on the client with a configurable plan target
   (in-memory scan instead of SQL index; no FTS/traversal steps client-side).
3. (Stretch) A shared step-executor skeleton abstracted over a store interface
   (index-backed in the host, working-set-backed in the client).

Full executor unification is explicitly **not** a goal — the host executor's SQL index,
Automerge host loading, and traversal machinery have no client-side counterpart.

### G7 — Strong-dep loading becomes tractable

Not a separate workstream: brittleness in strong-deps + disk/network loading is the
symptom that G1 + G2 cure. Success here means the recent stall-fix logic
(`_scheduleStrongDepDiskLoads`, unavailable-wake-ups) is expressible as plain state
transitions on entity-cores rather than cross-class event choreography, and is covered by
the existing stall tests.

### G8 — Deprecate `getObjectById` on the user-facing surface

`Database.getObjectById` duplicates the query path (`Query.select(Filter.ids(...))`) and
Ref resolution. Mark it `@deprecated` on the public `Database` interface (`@dxos/echo`)
and the `EchoDatabaseImpl` facade, pointing at the query/Ref replacement. Migrate in-repo
call sites (~28 files, mostly plugins) where the replacement is mechanical. Behavior stays
intact; actual removal is follow-up work outside this refactor. Internally, by-id lookup
remains a first-class entity-manager operation — this is about narrowing the _user-facing_
surface, not the capability.

### G9 — Protocol heavy lifting moves from echo-handler to entity-core

`EchoReactiveHandler` currently owns substantial domain logic that has nothing to do with
proxy mechanics: schema resolution (`getSchema`, `_getStaticTypeSchemaSlot`), type-entity
materialization (`getTypeEntity`), ref creation/lookup/flushing (`createRef`, `lookupRef`,
`saveRefs`), relation source/target resolution, and parent resolution. All of it moves to
entity-core as instance methods — the natural home once entity-core owns lifecycle state,
dep references, and the link cache (G2). The handler shrinks to a thin trap layer that
translates property access into entity-core calls. Exported handler helpers keep their
signatures (delegating), so no consumer changes.

### G10 — Proxies get a real prototype; traps only where necessary

Today every property access on an ECHO object goes through proxy traps. Give proxy targets
a proper prototype chain so that fixed-shape members — methods, well-known symbols
(`toJSON`, inspection, devtools formatter), id, and schema-known accessors via property
descriptors — are served by the prototype, and only dynamic document-data paths go through
the handler. This is a structural/performance goal with a strict behavioral-equivalence
constraint: enumeration (`Object.keys`, spread), descriptor semantics, `instanceof`, and
JSON/devtools output must be observably identical, verified by the existing proxy test
suites before and after.

### G11 — Feed subsystem gets a designed structure, anchored in the database

Two related moves:

**(a) A feed-manager as the structural analogue of the entity-manager**, formalizing the
`database → feed → item` hierarchy. The per-database **feed-manager** (evolution of
`QueueFactory`) owns feed lifecycle: get/create, service wiring, parent-entity binding,
close. Each **feed** (evolution of `QueueImpl`) owns its item window: paging, append,
the item identity cache, and its query context. Analogue means parallel design language —
explicit ownership, explicit item states (fetched / hydrated / failed-to-decode), one
home per concern — not forced API symmetry: per D1, items do not become entity-cores, and
the feed side keeps its two-level shape where the entity-manager has a flat working set.

**(b) One anchor: feeds merge into the database.** Today queues are a sibling system wired
at the client level — `EchoClient` holds a per-space `QueueFactory` map, `SpaceProxy`
constructs the factory itself, and the hypergraph carries a parallel queue-factory
registry purely for ref resolution. Instead, `DatabaseImpl` becomes the single per-space
anchor owning both the entity-manager and the feed-manager. This gives the D1 shared
identity/ref service its natural home — the database routes DXN resolution to the
entity-manager or the feed-manager — and the hypergraph's queue-factory registry
disappears. `Space.queues` keeps its exact public surface, delegating to the database's
feed-manager.

Removing `Feed.FeedService` (the Effect facade) is under consideration but explicitly out
of scope for this refactor.

### G12 — Package renames that reflect purpose; ObjectCore goes private

Rename `@dxos/echo-db` → **`@dxos/echo-client`** and `@dxos/echo-pipeline` →
**`@dxos/echo-host`**, reflecting what the packages actually are: the client-side database
runtime and the host-side storage/index/query engine. Mechanical: directory move, package
name, moon project id, all import sites (58 / 9 dependent packages) — no compat aliases.
Both packages are currently published; the new names need trusted-publisher setup before
they can publish (repo policy: new packages start `"private": true`).

In the same frontloaded phase, `ObjectCore` and `getObjectCore` leave the public barrel.
External usage is shallow: sheet/sketch serializers only set the id of a freshly created
object (replaced by id-at-creation support), and `sdk/migrations` is the one deep consumer
(moved to a deliberate internal entrypoint). After this, entity-core can be restructured
freely without touching any consumer.

## Design decisions

### D1 — Feed items are NOT managed by the entity-manager

The Feed _entity_ (the hidden descriptor object) is an ordinary space object and lives in
the entity-manager like any other. Feed _items_ do not become entity-cores:

- **Different persistence contract.** A db object persists on assignment (CRDT mutation
  through the doc handle); a feed item is an immutable JSON snapshot hydrated via
  `Obj.fromJSON` — in-memory mutation does not persist, writes go through `append`.
  Folding both behind one entity-core would make the abstraction lie about exactly the
  property users most depend on, and faithfully reproducing the difference is observable
  behavior we are forbidden from changing anyway.
- **Different working-set semantics.** The entity-manager tracks every core for the
  lifetime of the database; feeds are unbounded and windowed/paged. Pinning items in the
  manager map is a memory leak by design; eviction would break the manager's identity
  invariants.
- **Different machinery.** Doc rebinding, mount paths, strong-dep disk probes, and link
  following are meaningless for feed items; most of the G2 `attached` state would be dead
  weight.
- **Moving target.** Queue→feed phases 5/6 are pending; coupling feeds into the riskiest
  part of this refactor bakes in semantics that are scheduled to change.

Instead, convergence happens at three narrow seams, where the duplication actually hurts:

1. **Identity/refs** — one per-space ref-resolution/identity service consulted by both the
   entity-manager and the feed side, so refs between doc objects and feed items resolve
   through a single component (today `QueueImpl` wires its own resolver and `_objectCache`).
2. **Query** — feeds keep implementing the same `QueryContext` seam; the unified filter
   matcher (G6.1) and dedup semantics (G5) apply to queue queries too. The host executor
   already models doc-backed and queue-backed results as one `QueryItem` union — the union
   belongs at the query layer, not the object-model layer.
3. **Hydration** — one JSON→live-object path (`Obj.fromJSON`), already shared with
   `@dxos/echo`.

Revisit if feeds ever become local-first/CRDT-backed — then the persistence-contract
argument collapses and items should become entity-cores with a feed backing.

## Non-goals

- Any change to public APIs of `@dxos/echo-db`, `@dxos/echo`, or `@dxos/client`
  (including currently-deprecated exports — deprecation removal is separate work).
  Sole exception: the G8 `getObjectById` deprecation marker (no behavior change).
- Any change to observable behavior, event ordering guarantees relied on by tests, or
  RPC/protocol surfaces.
- Queue phases 5/6 (migrating `space.queues` call sites, protocol renames).
- Removing `Feed.FeedService` (the Effect facade) — under consideration, deferred.
- Unifying echo-db's proxy with `@dxos/echo`'s `typed-handler`.
- Performance optimization (must not regress, but speedups are not a goal).

## Constraints

- External consumers pin parts of the "internal" surface. Reach-ins routed through
  `db.coreDatabase` (devtools, cli-util, observability, functions-runtime-cloudflare,
  sdk/migrations via `_repo`) are _migrated_ to named `DatabaseImpl` API methods as part
  of G1 — same change, no shims. `getObjectCore` (plugins, migrations), the `ObjectCore`
  type (migration-builder), and `Space.queues: QueueFactory` (client-protocol) keep
  working unchanged (via delegating exports where the backing class is renamed/merged).
- The refactor must be staged: each stage lands independently with the full suite green,
  so it can pause indefinitely without leaving the package in a half-state.
- Existing tests are the behavioral spec. Where coverage is thin on a seam being moved
  (e.g. loading-state transitions), characterization tests are added _before_ the move.

## Success criteria

- `moon run :test` green before and after every stage; no test modified except to add
  coverage or update internal import paths.
- The five lifecycle states are a real discriminated state on entity-core; the
  maps/sets that previously encoded them are gone.
- Strong deps are direct entity-core → entity-core references; the string-keyed reverse
  dep index and recursive map walks are gone.
- One state-change event bus replaces the loader events + `_updateEvent` predicate-polling.
- `automerge-doc-loader.ts` no longer exists as a separate event-driven layer.
- No consumer anywhere reaches through `db.coreDatabase`; the accessor is gone and the
  needed capabilities are named methods on `DatabaseImpl`.
- Core : root-proxy is 1:1, held on the entity-core; the `_rootProxies` map and the
  separate `linkCache` mechanism are gone.
- `EchoReactiveHandler` contains traps and translation only — no schema resolution,
  type-entity materialization, or ref/link logic.
- Fixed-shape members are served from the proxy prototype; handler traps fire only for
  document-data access (verified by behavior-equivalence tests).
- `getObjectById` is `@deprecated` on the user-facing surface and in-repo callers are
  migrated to the query/Ref path.
- Feeds are reachable from exactly one per-space anchor (`DatabaseImpl`); `EchoClient`'s
  per-space queue-factory map and the hypergraph's queue-factory registry are gone, with
  ref resolution routed through the shared D1 identity/ref service.
- No file in echo-db over ~800 lines except tests.
- One filter-matching implementation in `echo-pipeline`.
- Cross-source query dedup is implemented and tested, not a TODO.
