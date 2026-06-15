# Strong Dependencies via RefResolver — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-express ECHO strong-dependency preloading/satisfaction in terms of a redesigned `RefResolver` so relations can have feed/queue objects and cross-space objects as `source`/`target`, and registry `Type`s as strong deps.

**Architecture:** Replace the four-method `RefResolver` surface with a single `resolve(uri, { source }) → RefResolverRequest` handle backed by coalesced per-URI `LoadOp`s (body tier) and per-call closure-aware `RequestImpl`s (cycle-safe BFS). `CoreDatabase` gets the resolver injected and delegates strong-dep satisfaction to it; `RefImpl` holds one lazy `network` request.

**Tech Stack:** TypeScript, Effect Schema, `@dxos/echo`, `@dxos/echo-client` (Automerge doc loader, `QueueFactory`, `HypergraphImpl`), `@dxos/async` `Event`, vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-strong-deps-refresolver-design.md`. Read it first.

**Commands:** `moon run echo:test`, `moon run echo-client:test`, single file via `moon run echo-client:test -- path/to/x.test.ts`. Lint: `moon run :lint -- --fix`.

---

## File structure

Created:

- `packages/core/echo/echo/src/internal/Ref/strong-deps.ts` — store-agnostic strong-dep extractor (`getStrongDependencies(entity): URI.URI[]`).
- `packages/core/echo/echo-client/src/core-db/load-op.ts` — `LoadOp` + `LoadOpTable` (coalesced per-URI body loading + refcount + backends).
- `packages/core/echo/echo-client/src/core-db/ref-resolver-request.ts` — `RequestImpl` (closure-aware handle + walker).
- `packages/core/echo/echo-client/src/core-db/ref-resolver.test.ts` — resolver/request/load-op suite.
- `packages/core/echo/echo-client/src/proxy-db/relation-endpoints.test.ts` — feed/cross-space/registry-type endpoint suite.

Modified:

- `packages/core/echo/echo/src/internal/Ref/ref.ts` — `RefSource`, `RefResolverRequest`, new `RefResolver.resolve`; `RefImpl` single lazy request + `FinalizationRegistry`; `StaticRefResolver`.
- `packages/core/echo/echo/src/Hypergraph.ts` — `RefResolverOptions` loses `middleware`.
- `packages/core/echo/echo-client/src/hypergraph.ts` — `LoadOpTable` wiring, `createRefResolver` returns the new resolver, remove cross-space guard + `_resolveEvents` (subsumed).
- `packages/core/echo/echo-client/src/core-db/object-core.ts` — `getStrongDependencies()` → URIs, delegates to extractor.
- `packages/core/echo/echo-client/src/core-db/core-database.ts` — inject resolver, retire `_strongDepsIndex`/`_unavailableObjects`/BFS, rewrite `loadObjectCoreById`/surfacing.
- `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts` — relation `source`/`target` + `isDeleted` via new resolver; fold `_handleStoredSchema` away from `middleware`.
- `packages/core/echo/echo/src/internal/Obj/json-serializer.ts` — `resolveSchema`/`resolveType`/`resolve` → `resolve(uri,{source:'network'}).wait()`.
- `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts` — translate to new model.
- `packages/sdk/client/src/devtools/devtools.ts`, `packages/core/echo/echo/src/Database.ts` — port `createRefResolver().resolve` call sites.

---

## Task 1: New resolver types + StaticRefResolver

**Files:**

- Modify: `packages/core/echo/echo/src/internal/Ref/ref.ts` (`RefResolver`, `StaticRefResolver`)
- Test: `packages/core/echo/echo-client/src/core-db/ref-resolver.test.ts`

Introduce the new surface. Keep the old `resolveSync`/`resolve`/`resolveSchema`/`resolveType` methods on the interface temporarily (marked `@deprecated`) so callers still compile; they are removed in Task 11.

- [ ] **Step 1: Add types and the new method to the interface**

```ts
// internal/Ref/ref.ts
import { Event } from '@dxos/async';

export type RefSource = 'working-set' | 'disk' | 'network';

export interface RefResolverRequest {
  readonly state: 'pending' | 'requesting' | 'ready' | 'unavailable';
  readonly stateChanged: Event<void>;
  getResult(): AnyProperties | undefined;
  wait(): Promise<AnyProperties | undefined>;
  abort(): void;
}

export interface RefResolver {
  resolve(uri: URI.URI, options: { source: RefSource }): RefResolverRequest;

  /** @deprecated Removed in Task 11. */
  resolveSync(uri: URI.URI, load: boolean, onLoad?: () => void): AnyProperties | undefined;
  /** @deprecated Removed in Task 11. */
  resolveSchemaLegacy?(uri: URI.URI): Promise<Schema.Schema.AnyNoContext | undefined>;
}
```

- [ ] **Step 2: Write a failing test for `StaticRefResolver.resolve`**

```ts
// ref-resolver.test.ts
import { describe, test } from 'vitest';
import { StaticRefResolver } from '@dxos/echo/internal';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EID } from '@dxos/keys';

describe('StaticRefResolver.resolve', () => {
  test('working-set hit resolves synchronously to ready', ({ expect }) => {
    const obj = Obj.make(TestSchema.Expando, { name: 'a' });
    const resolver = new StaticRefResolver().addObject(obj);
    const req = resolver.resolve(EID.make({ entityId: obj.id }), { source: 'working-set' });
    expect(req.state).toBe('ready');
    expect(req.getResult()).toBe(obj);
  });

  test('working-set miss resolves to unavailable', ({ expect }) => {
    const resolver = new StaticRefResolver();
    const req = resolver.resolve(EID.make({ entityId: EID.EntityId.random() }), { source: 'working-set' });
    expect(req.state).toBe('unavailable');
    expect(req.getResult()).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test, expect FAIL** (`resolve` not implemented). `moon run echo-client:test -- src/core-db/ref-resolver.test.ts`

- [ ] **Step 4: Implement `StaticRefResolver.resolve`**

```ts
// internal/Ref/ref.ts — in StaticRefResolver
resolve(uri: URI.URI, _options: { source: RefSource }): RefResolverRequest {
  const echoUri = EID.tryParse(uri);
  const id = echoUri ? EID.getEntityId(echoUri) : undefined;
  const obj = id != null ? this.objects.get(id) : undefined;
  const state = obj ? 'ready' : 'unavailable';
  const stateChanged = new Event<void>();
  return {
    state,
    stateChanged,
    getResult: () => (state === 'ready' ? obj : undefined),
    wait: async () => (state === 'ready' ? obj : undefined),
    abort: () => {},
  };
}
```

- [ ] **Step 5: Run test, expect PASS.**

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(echo): add RefResolverRequest surface (StaticRefResolver)"`

---

## Task 2: Store-agnostic strong-dep extractor

**Files:**

- Create: `packages/core/echo/echo/src/internal/Ref/strong-deps.ts`
- Modify: `packages/core/echo/echo-client/src/core-db/object-core.ts:520-564`
- Test: `packages/core/echo/echo/src/internal/Ref/strong-deps.test.ts`

Move the `type`/`source`+`target`/`parent` edge logic out of `ObjectCore` into a function over any entity, returning URIs (echo EIDs — local or cross-space — and `dxn:` type URIs). Drop the `EID.isLocal` filtering.

- [ ] **Step 1: Failing test**

```ts
// strong-deps.test.ts
import { describe, test } from 'vitest';
import { getStrongDependencies } from './strong-deps';
import { Obj, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

describe('getStrongDependencies', () => {
  test('relation yields source + target URIs', ({ expect }) => {
    const a = Obj.make(TestSchema.Expando, {});
    const b = Obj.make(TestSchema.Expando, {});
    const rel = Relation.make(TestSchema.HasManager, { [Relation.Source]: a, [Relation.Target]: b });
    const deps = getStrongDependencies(rel);
    expect(deps).toEqual(expect.arrayContaining([EID.make({ entityId: a.id }), EID.make({ entityId: b.id })]));
  });
});
```

- [ ] **Step 2: Run test, expect FAIL** (module missing).

- [ ] **Step 3: Implement extractor**

```ts
// internal/Ref/strong-deps.ts
import { EncodedReference } from '@dxos/echo-protocol';
import { EntityKind } from '../common/types';
import type { URI } from '@dxos/keys';

/** Direct strong-dep URIs of an entity: type, relation source/target, parent. */
export const getStrongDependencies = (entity: AnyEntity): URI.URI[] => {
  const res: URI.URI[] = [];
  const push = (ref: EncodedReference | undefined) => {
    if (ref) res.push(EncodedReference.toURI(ref));
  };
  push(getTypeRef(entity));
  if (getKind(entity) === EntityKind.Relation) {
    push(getSourceRef(entity));
    push(getTargetRef(entity));
  }
  push(getParentRef(entity));
  return res;
};
```

(Accessors `getTypeRef`/`getKind`/`getSourceRef`/`getTargetRef`/`getParentRef` read the encoded refs from the entity; for `ObjectCore` they map to `getType`/`getKind`/`getSource`/`getTarget`/`getParent`. Define a small interface these satisfy so queue items/snapshots can implement it.)

- [ ] **Step 4: Delegate from `ObjectCore`**

```ts
// object-core.ts
getStrongDependencies(): URI.URI[] {
  return getStrongDependencies(this);
}
```

- [ ] **Step 5: Run `moon run echo:test -- src/internal/Ref/strong-deps.test.ts`, expect PASS.**

- [ ] **Step 6: Commit** — `git commit -am "refactor(echo): extract store-agnostic getStrongDependencies (URIs)"`

---

## Task 3: LoadOp table (coalesced body loading)

**Files:**

- Create: `packages/core/echo/echo-client/src/core-db/load-op.ts`
- Test: `packages/core/echo/echo-client/src/core-db/ref-resolver.test.ts`

Per-URI coalesced body loading with refcount, `maxCeiling` escalation, and backends (echo-db doc loader, queue factory, registry). State machine: `pending → requesting → ready/unavailable`, `unavailable → requesting` on escalation, never `→ pending`.

- [ ] **Step 1: Define `LoadOp` + `LoadOpTable`**

```ts
// load-op.ts
export interface LoadOp {
  readonly uri: URI.URI;
  maxCeiling: RefSource;
  state: 'pending' | 'requesting' | 'ready' | 'unavailable';
  result: AnyProperties | null;
  readonly changed: Event<void>;
  refcount: number;
  cancel?: () => void;
}

export interface LoadBackend {
  /** Synchronous working-set probe. */
  probe(uri: URI.URI): AnyProperties | undefined;
  /** Start/await loading at the given ceiling; drives op.state/result via `set`. */
  load(uri: URI.URI, source: RefSource, set: (s: LoadOp['state'], r: AnyProperties | null) => void): () => void;
}

export class LoadOpTable {
  readonly #ops = new Map<URI.URI, LoadOp>();
  constructor(private readonly routeBackend: (uri: URI.URI) => LoadBackend | undefined) {}
  acquire(uri: URI.URI, source: RefSource): LoadOp {
    /* create-or-escalate, refcount++ */
  }
  release(op: LoadOp): void {
    /* refcount--, when 0 cancel + delete */
  }
}
```

- [ ] **Step 2: Failing tests** — coalescing (two `acquire` of same URI share one op + bump refcount), escalation (`disk` then `network` re-invokes backend, `unavailable→requesting`), release-to-zero cancels.

```ts
test('two acquires of the same uri share one op', ({ expect }) => {
  const table = new LoadOpTable(() => fakeBackend);
  const a = table.acquire(uri, 'disk');
  const b = table.acquire(uri, 'disk');
  expect(a).toBe(b);
  expect(a.refcount).toBe(2);
});
```

- [ ] **Step 3: Run, expect FAIL.**

- [ ] **Step 4: Implement `acquire`/`release`** (escalate `maxCeiling` upward only; on escalation call `backend.load` again and set `state='requesting'` if it was `unavailable`).

- [ ] **Step 5: Run, expect PASS.**

- [ ] **Step 6: Commit** — `git commit -am "feat(echo-client): LoadOpTable coalesced body loading"`

---

## Task 4: Closure-aware RequestImpl + walker

**Files:**

- Create: `packages/core/echo/echo-client/src/core-db/ref-resolver-request.ts`
- Test: `packages/core/echo/echo-client/src/core-db/ref-resolver.test.ts`

`RequestImpl` holds the root `LoadOp` + discovered closure members; on any member `changed` it re-walks (BFS, `seen`) using `getStrongDependencies`, attaches member ops, recomputes public `state`, emits `stateChanged` on a microtask.

- [ ] **Step 1: Define `RequestImpl`** per spec §6 (root, source, members map, state, stateChanged).

- [ ] **Step 2: Failing tests**
  - `ready` only when root + all closure bodies ready.
  - `unavailable` when any closure member is `unavailable`.
  - **cycle**: `A.parent=B, B.parent=A` — both reach `ready`, no hang (use a fake backend that resolves both bodies).
  - transitive `unavailable` (`A→B→C`, C unavailable) → A `unavailable`.

```ts
test('cycle A<->B both bodies ready => ready, no deadlock', async ({ expect }) => {
  // fake backend resolves bodies a,b whose getStrongDependencies cite each other
  const req = resolver.resolve(aUri, { source: 'disk' });
  await req.wait();
  expect(req.state).toBe('ready');
});
```

- [ ] **Step 3: Run, expect FAIL.**

- [ ] **Step 4: Implement walker** — recompute predicate:

```ts
#recompute() {
  // discover closure via BFS over getResult() bodies + getStrongDependencies, seen-guarded
  // attach LoadOps for new uris at this.source; subscribe to their `changed`
  // state = unavailable if any member unavailable; ready if all ready; else requesting/pending
  // if changed, queueMicrotask(() => this.stateChanged.emit())
}
```

- [ ] **Step 5: Run, expect PASS.**

- [ ] **Step 6: Commit** — `git commit -am "feat(echo-client): closure-aware RefResolverRequest walker"`

---

## Task 5: Wire HypergraphImpl backends + `resolve`

**Files:**

- Modify: `packages/core/echo/echo-client/src/hypergraph.ts`
- Test: `packages/core/echo/echo-client/src/core-db/ref-resolver.test.ts`

Construct a `LoadOpTable` with three backends routed by URI kind/space: echo-db (wraps `db.coreDatabase.loadObjectCoreById` body tier + `getObjectById` working-set probe), queue (wraps `queueFactory.get(...).getObjectsById`), registry (`_registry.getByURI`, working-set). `createRefResolver(context)` returns `{ resolve }` building `RequestImpl`s. Map `source` ceilings onto the doc loader's `diskOnly`/network and queue tiers.

- [ ] **Step 1: Failing integration test** — resolve a same-space db object at `disk`; resolve a registry type by DXN at `working-set`; resolve an unreachable object → `unavailable` (translate from `strong-deps-stall`).

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement backends + routing** (remove the `'Cross-space references are not yet supported'` throw; an absolute foreign-space EID routes to that space's db backend).

- [ ] **Step 4: Run, expect PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat(echo-client): HypergraphImpl resolve() over LoadOpTable backends"`

---

## Task 6: CoreDatabase satisfaction via resolver

**Files:**

- Modify: `packages/core/echo/echo-client/src/core-db/core-database.ts`
- Modify: `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts`

Inject the resolver; replace `_strongDepsIndex`/`_unavailableObjects`/`_onObjectUnavailable`/`_areDepsSatisfied`/`_areDepsResolved` with a per-core closure-aware `resolve(selfUri, { source: 'disk' })` whose `ready` is the surface gate; subscribe `stateChanged → _scheduleThrottledUpdate`. Rewrite `loadObjectCoreById` to await that request; keep `returnWithUnsatisfiedDeps`; drop `diskOnly`. `areStrongDepsSatisfied(core)` reads the request state.

- [ ] **Step 1: Translate `strong-deps-stall.test.ts`** to assert via `loadObjectCoreById` (no `diskOnly` arg) + `areStrongDepsSatisfied`. Keep all five scenarios.

- [ ] **Step 2: Run, expect FAIL/compile error.**

- [ ] **Step 3: Implement** — hold `Map<EntityId, RefResolverRequest>` for surfaced cores; on create issue the request; on `stateChanged` recompute + schedule.

- [ ] **Step 4: Run `moon run echo-client:test -- src/core-db/strong-deps-stall.test.ts`, expect PASS.**

- [ ] **Step 5: Run full `moon run echo-client:test`** (catch query-pipeline regressions).

- [ ] **Step 6: Commit** — `git commit -am "refactor(echo-client): strong-dep satisfaction via RefResolver"`

---

## Task 7: Relation read path + isDeleted

**Files:**

- Modify: `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:402-445,487-514`

`_getRelationSource`/`_getRelationTarget` use `resolve(uri, { source: 'working-set' }).getResult()`. `isDeleted` parent walk uses the working-set probe.

- [ ] **Step 1:** Update both getters + `isDeleted` (in `object-core.ts:487-514` if it resolves parent via db).
- [ ] **Step 2:** Run `moon run echo-client:test -- src/proxy-db/relations.test.ts`, expect PASS.
- [ ] **Step 3: Commit** — `git commit -am "refactor(echo-client): relation endpoints via resolve(working-set)"`

---

## Task 8: RefImpl single lazy request

**Files:**

- Modify: `packages/core/echo/echo/src/internal/Ref/ref.ts` (`RefImpl`)

One lazily-created `resolve(uri, { source: 'network' })`; `.target` = `getResult()`; `.load()`/`.tryLoad()` = `wait()`; `#resolved` driven by `stateChanged`; `FinalizationRegistry` aborts on GC.

- [ ] **Step 1: Failing test** — `ref.load()` resolves a not-yet-loaded object; `ref.target` returns undefined then fires `onResolved` when ready.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `#request` lazy getter + `FinalizationRegistry`.

```ts
get target(): T | undefined {
  if (this.#target) return this.#target;
  return this.#getRequest().getResult() as T | undefined;
}
#getRequest(): RefResolverRequest {
  if (!this.#request) {
    invariant(this.#resolver);
    this.#request = this.#resolver.resolve(this.#uri, { source: 'network' });
    this.#request.stateChanged.on(this.#resolverCallback);
    REF_FINALIZER.register(this, this.#request);
  }
  return this.#request;
}
```

- [ ] **Step 4: Run `moon run echo:test`, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "refactor(echo): RefImpl holds one lazy network request"`

---

## Task 9: json-serializer migration

**Files:**

- Modify: `packages/core/echo/echo/src/internal/Obj/json-serializer.ts:97-164`

Replace `resolveSchema`/`resolveType`/`resolve` with `resolve(uri, { source: 'network' }).wait()` (+ `Type.getSchema` where a schema is needed).

- [ ] **Step 1:** Update the four call sites.
- [ ] **Step 2:** Run `moon run echo:test -- src/internal/Obj/json-serializer.test.ts`, expect PASS.
- [ ] **Step 3: Commit** — `git commit -am "refactor(echo): json-serializer uses resolve()"`

---

## Task 10: Remove middleware; fold stored-schema canonicalization

**Files:**

- Modify: `packages/core/echo/echo/src/Hypergraph.ts:31-43,71-77`
- Modify: `packages/core/echo/echo-client/src/hypergraph.ts` (echo-db backend)
- Modify: `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:955-979`

Move `_handleStoredSchema` canonicalization (persisted `TypeSchema` → `_getOrRegisterPersistentSchema`) into the echo-db backend; remove `RefResolverOptions.middleware`; `lookupRef` sets the standard resolver. `RefResolverOptions` → `{ context? }`.

- [ ] **Step 1: Failing test** — resolving a ref to a persisted stored schema yields the registered `Type.Type` entity (no middleware).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** backend canonicalization + delete `middleware`.
- [ ] **Step 4: Run `moon run echo-client:test`, expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "refactor(echo): remove RefResolver middleware; canonicalize stored schema in backend"`

---

## Task 11: Remove legacy resolver methods + port remaining callers

**Files:**

- Modify: `packages/core/echo/echo/src/internal/Ref/ref.ts` (drop deprecated methods)
- Modify: `packages/sdk/client/src/devtools/devtools.ts:205`, `packages/core/echo/echo/src/Database.ts:248-253`

Delete `resolveSync`/old `resolve`/`resolveSchema`/`resolveType` from `RefResolver`; port `devtools` and `Database.ts` to `resolve(uri, { source: 'network' }).wait()`.

- [ ] **Step 1:** Remove deprecated methods; fix the two callers.
- [ ] **Step 2:** Build: `moon run echo:build && moon run echo-client:build`, expect no TS errors. Audit casts: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`.
- [ ] **Step 3:** Run `moon run echo:test && moon run echo-client:test`, expect PASS.
- [ ] **Step 4: Commit** — `git commit -am "refactor(echo): remove legacy RefResolver methods"`

---

## Task 12: Feature tests — feed / cross-space / registry-type endpoints

**Files:**

- Create: `packages/core/echo/echo-client/src/proxy-db/relation-endpoints.test.ts`

- [ ] **Step 1:** Write three tests:
  1. relation whose `source`/`target` is a **feed (queue) object**, surfaced by `db.query(Filter.type(Rel))` — `rel.source`/`rel.target` resolve synchronously after surfacing.
  2. **cross-space** relation (two spaces in one hypergraph) — endpoint in space B, relation in space A.
  3. relation/object with a **registry `Type`** as its only strong dep — surfaces immediately (registry backend `working-set`).
- [ ] **Step 2:** Run, expect PASS.
- [ ] **Step 3:** Full `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism` across echo packages.
- [ ] **Step 4: Commit** — `git commit -am "test(echo-client): feed/cross-space/registry-type relation endpoints"`

---

## Self-review notes

- **Spec coverage:** §1 API → T1/T5/T11; §2 layers → T3/T4; §3 deps → T2; §4 CoreDatabase → T6; §5 read path → T7/T8/T9; §6 internal state → T3/T4/T5; §7 middleware → T10; capabilities → T12.
- **Build-green discipline:** legacy methods stay until T11, so each task compiles. No compat shims survive the final task.
- **Cast audit** is an explicit step (T11.2) per repo rules.
- **Open risk:** the queue backend's disk-vs-network tiers (spec §1) may need `QueueFactory` API additions; if so, that becomes a sub-task of T5. Flag during execution if the queue API can't express the ceiling.
