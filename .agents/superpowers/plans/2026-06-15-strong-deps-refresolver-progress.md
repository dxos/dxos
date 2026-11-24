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

Acceptance suite `strong-deps-resolution.test.ts`: 10/11 pass.

- ✅ feed in-memory, feed reload, parent feed, cross-space in-memory, + all regression guards.
- 🔴 multi-peer feed (from network) — queue items must replicate/fetch to peer 2; the disk-tier
  queue poll doesn't surface them within the timeout. Open: wire a network pull (`queue.sync`) or
  raise the queue ceiling. (Flagged as an open item in the handoff.)

The 2 transient regressions (deleted-object re-add / deleted-after-reload) were fixed by making
resolution deleted-agnostic (deletion is the query's filter, not resolution's).

## Key decision

Cross-space relations store their endpoint refs **space-less** (a relation created in-memory has no
db yet, so `createRef` can't know the endpoint's space). Per the spec ("only the load/surface path
changes"), resolution treats a local `echo:` EID as resolvable across **all** registered spaces
(entity ids are globally unique) rather than assuming the owning space.
