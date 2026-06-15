# Strong-deps RefResolver — execution notes

Branch: `claude/intelligent-darwin-apde4r` (same commit as `dm/strong-deps-refresolver`).

Baseline (before changes): `strong-deps-resolution.test.ts` 5 fail / rest green; whole echo-client suite 619 pass.

Acceptance (drive green):

- relation automerge→feed: in-memory / after reload / multi-peer
- relation cross-space (automerge→automerge): in-memory
- parent automerge→feed: in-memory

## Design decisions (deviations from spec, all sound)

- New `RefResolver.resolve(uri, { source }) -> RefResolverRequest` is the canonical surface.
  Legacy `resolveSync` / `resolveLegacy` (was async `resolve`) / `resolveSchema` / `resolveType`
  kept (deprecated) until the final cleanup task so the build stays green per step.
- Strong-dep extraction is **store-aware at the backend**: each `LoadOp` carries a `strongDeps()`
  thunk supplied by its backend — echo-db reads the reliable `ObjectCore` encoded refs, queue reads
  the decoded entity via public symbols, registry returns `[]`. This is more correct than a single
  live-entity extractor (live db proxies don't expose a parent _URI_, only a resolved parent).
- Type dep semantics unchanged: a type is a strong dep only when persisted (echo-URI). Static /
  registry types (`dxn:`) are always available, so they are not gated (matches current behaviour and
  keeps the stored-schema regression test green).

## Status

- [x] Task 1: new resolver types + StaticRefResolver.resolve (legacy kept)
- [x] Task 2: strong-dep extractor (`getStrongDependencies` / `getStrongDependencyUris`)
- [x] Task 3: LoadOpTable (coalesced body loading + refcount + escalation)
- [x] Task 4: RequestImpl walker (cycle-safe BFS, microtask-deferred stateChanged)
- [x] Task 5: HypergraphImpl backends + resolve() — registry / per-space / cross-space-by-id
- [x] Task 6: CoreDatabase satisfaction delegated to resolver (`_areDepsSatisfied`/`_areDepsResolved`
      → request state; retired `_strongDepsIndex` + BFS waking)
- [x] Task 7: relation source/target + parent read path → `resolve(working-set).getResult()`
- [ ] Task 8: RefImpl single lazy request (still uses legacy resolveSync/resolveLegacy)
- [ ] Task 9: json-serializer migration (still uses resolveLegacy/resolveSchema/resolveType)
- [ ] Task 10: remove middleware
- [ ] Task 11: remove legacy methods + port remaining callers
- [ ] Task 12: feature tests (ref-resolver.test.ts, relation-endpoints.test.ts)

## Test state

- `echo`: 382 pass / 0 fail.
- `echo-client`: 623 pass / 1 fail (multi-peer) — up from 619 baseline.
- Acceptance suite `strong-deps-resolution.test.ts`: 10/11 pass — feed in-memory/reload, parent
  feed, **cross-space**, all regression guards.
- 🔴 multi-peer feed (from network) — **blocked on test infrastructure**: the test `EchoHost` is
  constructed without `syncQueue`, and `host.addReplicator` only replicates Automerge docs, not
  feeds. So peer 2's local feed store never receives peer 1's queue items; no resolver change can
  surface them. Needs feed/queue replication wired in the harness (separate work). Flagged in the
  handoff ("confirm that path is wired").

## Key decision (per @dmaretskyi)

Cross-space relations are fixed in the **write path**, not resolution: when a relation is bound to a
db (`DatabaseImpl._addObject`), `rebindRelationEndpoints` re-resolves its endpoints now that the db
is known — a same-space (or not-yet-persisted, hence added) endpoint gets a relative URI, a
cross-space endpoint an absolute one; feed-queue endpoints already carry an absolute URI. Resolution
then routes a relative ref to its owning space (`qualifyUri`/`absolutizeDeps`) and an absolute ref to
its space; a cross-space backend remains only as a defensive fallback.

Two transient deleted-object regressions were fixed: resolution is deleted-agnostic (so a deleted
object still satisfies its own closure / surfaces in deleted-only queries), and the relation
source/target/parent **read path** drops a deleted result so `getSource` etc. throw as before.
