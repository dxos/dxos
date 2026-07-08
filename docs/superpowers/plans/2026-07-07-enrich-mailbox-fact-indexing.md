# EnrichMailbox Fact Indexing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `EnrichMailbox` operation that iterates the mailbox feed produced by the ingestion sync and runs `extractFactsStage` with its own cursor, writing facts into a shared per-space `FactStore` that a new Mailbox companion surface renders via `FactViewer`.

**Architecture:** Reuse the `SyncBinding` lifecycle (source stream → `dedupStage` → stage → paged `commit` + `advanceCursor`) via a new sibling `DerivedBinding` relation (`source: Feed`, `target: Mailbox`). Facts are written page-atomically into a `FactStore` (in-memory Phase 1) exposed as a plugin capability, shared between the operation (writer, via a `FactIndexer` closure) and a companion React surface (reader, via `useCapability`). Operations and React run in the same browser main-thread JS context, so the capability is a genuine shared singleton.

**Tech Stack:** Effect-TS (`effect/Stream`, `effect/Effect`, `Layer`, `Context`), `@dxos/pipeline` (`Stage`, `Pipeline`), `@dxos/plugin-connector` (`SyncBinding`), `@dxos/pipeline-rdf` (`FactStore`, `RDF`), `@dxos/pipeline-email` (`extractFactsStage`, `messageSource`), `@dxos/compute` (`Operation`, `ServiceResolver`), `@dxos/app-framework` (`Capability`, `AppSurface`, `Surface`), `@dxos/echo` (`Feed`, `Database`, `Filter`, `Relation`, `Ref`), React (`@dxos/react-ui*`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-07-enrich-mailbox-fact-indexing-design.md`

---

## File Structure

Order builds bottom-up: shared machinery → stage/commit → store capability → operation → UI.

- **Modify** `packages/plugins/plugin-connector/src/types/SyncBinding.ts` — generalize `State.binding` to `CursorHolder` so the lifecycle (`layer`/`commit`/`upsertCommit`/`dedupStage`/`advanceCursor`) accepts either binding type.
- **Create** `packages/plugins/plugin-connector/src/types/DerivedBinding.ts` — new relation `source: Feed, target: Mailbox` + `make`; re-exported from the connector's type barrel.
- **Create** `packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts` — a facts-*returning* stage variant + a `FactUnit` type (kept separate so the side-effecting `extractFactsStage` stays untouched for batch use).
- **Create** `packages/plugins/plugin-inbox/src/sync/FactCommit.ts` — `factsCommit` sink (`FactStore.putFacts(page) + advanceCursor`).
- **Create** `packages/plugins/plugin-inbox/src/capabilities/fact-store.ts` — per-space in-memory `FactStore` capability + a space-affinity `LayerSpec` that injects it into operations.
- **Create** `packages/plugins/plugin-inbox/src/operations/enrich/enrich-mailbox.ts` — the `EnrichMailbox` operation handler.
- **Modify** `packages/plugins/plugin-inbox/src/types/InboxOperation.ts` — `EnrichMailbox` operation definition (input/output/services).
- **Modify** `packages/plugins/plugin-inbox/src/capabilities/operation-handler.ts` + `index.ts` — register the handler + capability.
- **Create** `packages/ui/react-ui-fact-viewer/*` — relocate `FactViewer` + its presentational helpers into a plugin-consumable package.
- **Modify** `packages/stories/stories-brain/*` — import `FactViewer` from the new package (delete the local copy, no shim).
- **Modify** `packages/plugins/plugin-inbox/src/capabilities/react-surface.tsx` — Mailbox companion surface rendering `FactViewer`.
- **Create** `packages/plugins/plugin-inbox/src/containers/MailboxFactsCompanion/*` — the container that queries the store and renders the viewer.

---

## Task 1: Generalize `SyncBinding.State.binding` to a cursor holder

Enables the shared lifecycle to accept the new `DerivedBinding` without a `Connection`. `State.binding` is only read for `binding.cursor` (`SyncBinding.ts` `layer`).

**Files:**
- Modify: `packages/plugins/plugin-connector/src/types/SyncBinding.ts`
- Test: `packages/plugins/plugin-connector/src/types/SyncBinding.test.ts` (extend existing suite if present; else create)

- [ ] **Step 1: Write the failing test**

Add to the SyncBinding test suite (adjust import paths to the file's existing style):

```ts
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';
import { Ref } from '@dxos/echo';
import { Cursor } from '@dxos/types';
import { SyncBinding } from './SyncBinding';

describe('SyncBinding.State.binding generalization', () => {
  test('layer accepts a bare cursor holder (no Connection source)', ({ expect }) =>
    Effect.gen(function* () {
      const cursor = Cursor.make({});
      // A minimal holder: only `.cursor` is read by the machinery.
      const holder: SyncBinding.CursorHolder = { cursor: Ref.make(cursor) };
      const state = yield* SyncBinding.makeStateForTest({
        binding: holder,
        foreignKeySource: 'test.source',
        cursorKey: 0,
        stats: { newMessages: 0 },
      });
      expect(state.cursor).toBeDefined();
    }).pipe(/* provide Database test layer per the suite's TestLayer */ Effect.runPromise));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-connector:test -- src/types/SyncBinding.test.ts`
Expected: FAIL — `CursorHolder` / `makeStateForTest` not exported.

- [ ] **Step 3: Implement the generalization**

In `SyncBinding.ts`, introduce a `CursorHolder` type and change `State.binding`'s type from `SyncBinding` to it. Keep the field name `binding` for churn minimalism.

```ts
/** The minimal shape the sync lifecycle needs from a binding: its progress cursor. */
export type CursorHolder = { readonly cursor: Ref.Ref<Cursor.Cursor> };

// In `State`:
//   readonly binding: CursorHolder;   // was: SyncBinding
```

`layer` already does `Database.load(options.binding.cursor)`, which is satisfied by `CursorHolder`. No other change needed there. Update `LayerOptions` (`Omit<State, ...>`) — it already omits `cursor`; `binding` stays. If the suite has no state constructor to test, export a tiny helper:

```ts
/** Test seam: builds `State` from `LayerOptions` the same way `layer` does, without a Layer. */
export const makeStateForTest = (options: LayerOptions): Effect.Effect<State, never, Database.Service> =>
  Effect.gen(function* () {
    const cursor = yield* Database.load(options.binding.cursor).pipe(Effect.orDie);
    const dedupSet = options.feed ? yield* /* seedDedupSet */ Effect.succeed(new Set<string>()) : new Set<string>();
    return { ...options, cursor, formatCursor: options.formatCursor ?? Cursor.formatKey, dedupSet, createdContactEmails: new Set() };
  });
```

(If a real state-building test seam already exists, use it instead of adding `makeStateForTest`.)

- [ ] **Step 4: Verify existing SyncBinding callers still typecheck**

Run: `moon run plugin-connector:build`
Expected: PASS. `gmail/sync.ts` and `contacts/sync.ts` pass a real `SyncBinding` (which structurally satisfies `CursorHolder` because it has `.cursor`), so no call-site change.

- [ ] **Step 5: Run the test**

Run: `moon run plugin-connector:test -- src/types/SyncBinding.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-connector/src/types/SyncBinding.ts packages/plugins/plugin-connector/src/types/SyncBinding.test.ts
git commit -m "refactor(plugin-connector): generalize SyncBinding.State.binding to CursorHolder"
```

---

## Task 2: Add the `DerivedBinding` relation type

A sibling to `SyncBinding` with concrete endpoints `source: Feed, target: Mailbox`, materializing its own `Cursor` child (mirrors `SyncBinding.make`).

**Files:**
- Create: `packages/plugins/plugin-connector/src/types/DerivedBinding.ts`
- Modify: `packages/plugins/plugin-connector/src/types/index.ts` (barrel)
- Test: `packages/plugins/plugin-connector/src/types/DerivedBinding.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test } from 'vitest';
import { Feed, Obj } from '@dxos/echo';
import { DerivedBinding } from './DerivedBinding';

describe('DerivedBinding', () => {
  test('make links a feed source to a mailbox target with a fresh cursor', ({ expect }) => {
    const feed = Feed.make();
    // Mailbox.make requires the inbox types; use the connector test double or a plain Obj if the
    // relation target is validated structurally. Prefer the real Mailbox in an inbox-level test.
    const target = feed; // placeholder target shape; replaced by Mailbox in the inbox integration test
    const binding = DerivedBinding.make({ source: feed, target });
    expect(DerivedBinding.instanceOf(binding)).toBe(true);
    expect(binding.cursor).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-connector:test -- src/types/DerivedBinding.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DerivedBinding`**

Model directly on `SyncBinding.ts:32` + `SyncBinding.make` (`SyncBinding.ts:67`). `source` is `Feed.Feed`; `target` is `Mailbox`. To avoid a plugin-connector → plugin-inbox dependency (Mailbox lives in plugin-inbox), keep `target: Obj.Unknown` here and narrow to `Mailbox` at the inbox call site. Endpoints stay concrete on the *source* (Feed) side; the target is the already-generic `Obj.Unknown` exactly as `SyncBinding.target` is.

```ts
// @import-as-namespace
import * as Schema from 'effect/Schema';
import { DXN, Obj, Ref, Relation } from '@dxos/echo';
import { Feed } from '@dxos/echo';
import { Cursor } from '@dxos/types';
import { Type } from '@dxos/echo';

/**
 * A binding whose source is a local {@link Feed} (produced by a remote {@link SyncBinding} sync) and
 * whose target is the object that owns downstream derived state (a Mailbox). Reuses the SyncBinding
 * lifecycle (State/layer/commit/dedupStage/advanceCursor) via its own {@link Cursor}. Unlike
 * SyncBinding it has no remote Connection — it processes data already landed locally.
 */
export class DerivedBinding extends Type.makeRelation<DerivedBinding>(
  DXN.make('org.dxos.type.derivedBinding', '0.1.0'),
)({
  source: Feed.Feed,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** Durable progress cursor for this derived processor (its own sync state). */
    cursor: Ref.Ref(Cursor.Cursor),
    /** Provider-specific options; opaque here. */
    options: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.optional),
  }),
) {}

export const instanceOf = (value: unknown): value is DerivedBinding => Relation.instanceOf(DerivedBinding, value);

export const make = ({
  cursor: cursorProps,
  ...props
}: Omit<Relation.MakeProps<typeof DerivedBinding>, 'cursor'> & { cursor?: Obj.MakeProps<typeof Cursor.Cursor> }) => {
  const cursor = Cursor.make(cursorProps);
  const binding = Relation.make(DerivedBinding, { ...props, cursor: Ref.make(cursor) });
  Relation.setParent(cursor, binding); // owned by the binding: cascade-delete + transitive persist
  return binding;
};
```

Add to `types/index.ts`:

```ts
export * as DerivedBinding from './DerivedBinding';
```

Register the schema wherever `SyncBinding` is registered (search for `SyncBinding` in the plugin's schema/type registration and add `DerivedBinding.DerivedBinding` alongside).

- [ ] **Step 4: Run the test**

Run: `moon run plugin-connector:test -- src/types/DerivedBinding.test.ts`
Expected: PASS.

- [ ] **Step 5: Build**

Run: `moon run plugin-connector:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-connector/src/types/DerivedBinding.ts packages/plugins/plugin-connector/src/types/DerivedBinding.test.ts packages/plugins/plugin-connector/src/types/index.ts
git commit -m "feat(plugin-connector): add DerivedBinding relation (feed-source, own cursor)"
```

---

## Task 3: Facts-returning stage variant + `FactUnit`

The batch `EmailPipeline.run` keeps the side-effecting `extractFactsStage`. The cursored operation needs a variant that *returns* facts so `factsCommit` can write them page-atomically.

**Files:**
- Create: `packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts`
- Modify: `packages/core/compute/pipeline-email/src/stages/index.ts` (export)
- Test: `packages/core/compute/pipeline-email/src/stages/extract-facts-commit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';
import { Pipeline } from '@dxos/pipeline';
import { Message } from '@dxos/types';
import { extractFactsUnitStage, type FactUnit } from './extract-facts-commit';

describe('extractFactsUnitStage', () => {
  test('emits a FactUnit carrying the message key and its extracted facts', ({ expect }) =>
    Effect.gen(function* () {
      const message = Message.make({ sender: { email: 'a@b.com' }, blocks: [{ type: 'text', text: 'Alice owes Bob $5' }] });
      const units: FactUnit[] = [];
      const extract = (_m: Message.Message) => Promise.resolve([{ /* minimal RDF.Fact */ } as any]);
      yield* Stream.fromIterable([message]).pipe(
        extractFactsUnitStage(extract),
        Pipeline.run({ sink: (unit) => Effect.sync(() => units.push(unit)) }),
      );
      expect(units).toHaveLength(1);
      expect(units[0].facts).toHaveLength(1);
      expect(typeof units[0].key).toBe('number');
    }).pipe(Effect.runPromise));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline-email:test -- src/stages/extract-facts-commit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the variant**

Reuse `FactIndexer` (`stages/extract-facts.ts:13`) and `messageSource` (`stages/facts.ts`) for the key/foreign-id.

```ts
import * as Effect from 'effect/Effect';
import { Stage } from '@dxos/pipeline';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';
import { type FactIndexer } from './extract-facts';
import { messageSource } from './facts';

/** Terminal unit for the cursored fact pipeline: facts + the keys `factsCommit` needs. */
export type FactUnit = {
  readonly facts: RDF.Fact[];
  readonly foreignId: string; // messageSource
  readonly key: number;       // message.created epoch-ms (D3 workaround)
};

/**
 * Facts-returning variant of `extractFactsStage`: instead of writing via the indexer as a
 * side-effect, it returns the extracted facts as a {@link FactUnit} so the sink can persist a page
 * atomically with the cursor advance. `extract` is a plain async closure (same shape as
 * {@link FactIndexer}) but resolves to the facts rather than void.
 */
export const extractFactsUnitStage = (
  extract: FactIndexer,
): Stage.Stage<Message.Message, FactUnit> =>
  Stage.map('extract-facts-unit', (message: Message.Message) =>
    Effect.tryPromise(() => extract(message)).pipe(
      Effect.map((facts): FactUnit => ({
        facts,
        foreignId: messageSource(message),
        // NOTE(workaround): `message.created` is the incremental cursor key because ECHO's native
        // feed cursor is unimplemented (Feed.cursor is stubbed; TODO @dxos/feed FeedCursor). Replace
        // with the native queue sequence when available. See design D3.
        key: Date.parse(message.created),
      })),
      Effect.orElseSucceed((): FactUnit => ({ facts: [], foreignId: messageSource(message), key: Date.parse(message.created) })),
    ),
  );
```

Export from `stages/index.ts`:

```ts
export { extractFactsUnitStage, type FactUnit } from './extract-facts-commit';
```

- [ ] **Step 4: Run the test**

Run: `moon run pipeline-email:test -- src/stages/extract-facts-commit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/pipeline-email/src/stages/extract-facts-commit.ts packages/core/compute/pipeline-email/src/stages/extract-facts-commit.test.ts packages/core/compute/pipeline-email/src/stages/index.ts
git commit -m "feat(pipeline-email): add facts-returning extractFactsUnitStage + FactUnit"
```

---

## Task 4: `factsCommit` sink (page-atomic put + advance)

**Files:**
- Create: `packages/plugins/plugin-inbox/src/sync/FactCommit.ts`
- Modify: `packages/plugins/plugin-inbox/src/sync/index.ts` (export)
- Test: `packages/plugins/plugin-inbox/src/sync/FactCommit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';
import { FactStore } from '@dxos/pipeline-rdf';
import { SyncBinding } from '@dxos/plugin-connector';
import { Cursor } from '@dxos/types';
import { Ref } from '@dxos/echo';
import { factsCommit } from './FactCommit';
import type { FactUnit } from '@dxos/pipeline-email';

describe('factsCommit', () => {
  test('persists a page of facts and advances the cursor to the max key', ({ expect }) =>
    Effect.gen(function* () {
      const store = yield* FactStore.FactStore;
      const cursor = Cursor.make({});
      const state: SyncBinding.State = /* build via SyncBinding test seam with binding={cursor:Ref.make(cursor)} */ {} as any;
      const page = Chunk.fromIterable<FactUnit>([
        { facts: [/* fact */] as any, foreignId: 'm1', key: 100 },
        { facts: [/* fact */] as any, foreignId: 'm2', key: 200 },
      ]);
      yield* factsCommit(page).pipe(Effect.provideService(SyncBinding.Service, state));
      const stored = yield* store.query({});
      expect(stored.length).toBeGreaterThan(0);
      expect(Cursor.parseKey(cursor.value)).toBe(200);
    }).pipe(Effect.provide(FactStore.layerMemory), Effect.runPromise));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-inbox:test -- src/sync/FactCommit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `factsCommit`**

Mirror `SyncBinding.upsertCommit` (`SyncBinding.ts:268`) — same "advance in the same commit as the writes" seam — but write to `FactStore` instead of the space db.

```ts
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import { FactStore } from '@dxos/pipeline-rdf';
import { type FactUnit } from '@dxos/pipeline-email';
import { SyncBinding } from '@dxos/plugin-connector';
import { Cursor } from '@dxos/types';

/**
 * `Pipeline.run` sink for the cursored fact pipeline. Persists a page of {@link FactUnit} facts to the
 * {@link FactStore} and advances the {@link SyncBinding} cursor to the page's max key in the same step
 * — page-atomic, mirroring `SyncBinding.upsertCommit`. Use after `Stream.grouped(pageSize)`.
 */
export const factsCommit = (
  page: Chunk.Chunk<FactUnit>,
): Effect.Effect<void, never, SyncBinding.Service | FactStore.FactStore> =>
  Effect.gen(function* () {
    const units = Chunk.toReadonlyArray(page);
    if (units.length === 0) {
      return;
    }
    const store = yield* FactStore.FactStore;
    const state = yield* SyncBinding.Service;
    const facts = units.flatMap((unit) => unit.facts);
    if (facts.length > 0) {
      yield* store.putFacts(facts).pipe(Effect.orDie); // store-write failure is fatal to the run
    }
    const maxKey = Math.max(...units.map((unit) => unit.key));
    Cursor.advance(state.cursor, state.formatCursor(maxKey));
    for (const unit of units) {
      state.dedupSet.add(unit.foreignId);
    }
  });
```

Export from `sync/index.ts`:

```ts
export * as FactCommit from './FactCommit';
```

- [ ] **Step 4: Run the test**

Run: `moon run plugin-inbox:test -- src/sync/FactCommit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/plugin-inbox/src/sync/FactCommit.ts packages/plugins/plugin-inbox/src/sync/FactCommit.test.ts packages/plugins/plugin-inbox/src/sync/index.ts
git commit -m "feat(plugin-inbox): add factsCommit sink (page-atomic putFacts + advanceCursor)"
```

---

## Task 5: Per-space in-memory `FactStore` capability + operation LayerSpec

The single shared instance. Read by the surface via `useCapability`; injected into the operation via a space-affinity `LayerSpec`.

**Files:**
- Create: `packages/plugins/plugin-inbox/src/capabilities/fact-store.ts`
- Modify: `packages/plugins/plugin-inbox/src/types/InboxCapabilities.ts` (capability tag)
- Modify: `packages/plugins/plugin-inbox/src/capabilities/index.ts`
- Test: `packages/plugins/plugin-inbox/src/capabilities/fact-store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, test } from 'vitest';
import { makeFactStoreRegistry } from './fact-store';

describe('FactStore registry', () => {
  test('returns the same store instance for a space id and distinct per space', ({ expect }) => {
    const registry = makeFactStoreRegistry();
    const a1 = registry.forSpace('space-a');
    const a2 = registry.forSpace('space-a');
    const b1 = registry.forSpace('space-b');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-inbox:test -- src/capabilities/fact-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the registry + capability + LayerSpec**

`FactStore.layerMemory` (`fact-store.ts:103`) is a `Layer.Layer<FactStore>`; build the `FactStoreApi` once per space and hold it. Because `layerMemory` is a `Layer`, materialize it into a live service via `Layer.build`/`Effect.runSync` (in the browser main thread this is synchronous for the memory layer) or expose the store as the resolved service instance.

```ts
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { FactStore } from '@dxos/pipeline-rdf';

export type FactStoreRegistry = {
  /** Returns the singleton in-memory FactStore service for a space (created on first use). */
  forSpace: (spaceId: string) => FactStore.FactStoreApi;
  /** A space-affinity Layer that provides `FactStore.FactStore` for the given space. */
  layerFor: (spaceId: string) => Layer.Layer<FactStore.FactStore>;
};

export const makeFactStoreRegistry = (): FactStoreRegistry => {
  const stores = new Map<string, FactStore.FactStoreApi>();
  const forSpace = (spaceId: string): FactStore.FactStoreApi => {
    const existing = stores.get(spaceId);
    if (existing) {
      return existing;
    }
    // Materialize the in-memory layer into a live service (memory layer has no async setup).
    const service = Effect.runSync(Layer.build(FactStore.layerMemory).pipe(Effect.scoped, Effect.map((ctx) => ctx.get(FactStore.FactStore as any)))) as FactStore.FactStoreApi;
    stores.set(spaceId, service);
    return service;
  };
  const layerFor = (spaceId: string) => Layer.succeed(FactStore.FactStore, forSpace(spaceId));
  return { forSpace, layerFor };
};
```

Add a capability tag in `InboxCapabilities.ts` (mirror the existing `ObjectExtractor` capability shape) named `FactStoreRegistry`, and contribute a single registry instance from the plugin's capability module. Then contribute a space-affinity operation `LayerSpec` (mirror `plugin-assistant/.../ai-service.ts:40` `affinity: 'space'`) whose factory reads `context.space` and returns `registry.layerFor(spaceId)` for `FactStore.FactStore`.

> Note: if `Effect.runSync(Layer.build(...))` proves awkward for the memory layer, prefer exposing `FactStore.layerMemory` directly as the operation LayerSpec and give the surface a read-only accessor that shares the same instance — the key invariant is **one instance per space, shared by writer and reader**. Whichever construction is used, keep that invariant and keep the registry the single source of truth.

- [ ] **Step 4: Run the test**

Run: `moon run plugin-inbox:test -- src/capabilities/fact-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Build**

Run: `moon run plugin-inbox:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/capabilities/fact-store.ts packages/plugins/plugin-inbox/src/capabilities/fact-store.test.ts packages/plugins/plugin-inbox/src/types/InboxCapabilities.ts packages/plugins/plugin-inbox/src/capabilities/index.ts
git commit -m "feat(plugin-inbox): per-space in-memory FactStore capability + operation LayerSpec"
```

---

## Task 6: `EnrichMailbox` operation definition

**Files:**
- Modify: `packages/plugins/plugin-inbox/src/types/InboxOperation.ts`
- Test: covered by Task 7's handler test.

- [ ] **Step 1: Add the operation definition**

Model on `ExtractMailbox` (`InboxOperation.ts:564`) and `ClassifyEmail`'s `services` (`InboxOperation.ts:478`).

```ts
/** Default page size for EnrichMailbox fact commits. */
export const DEFAULT_ENRICH_MAILBOX_PAGE_SIZE = 10;

export const EnrichMailbox = Operation.make({
  key: 'dxos.org/operation/inbox/enrich-mailbox',
  name: 'Enrich mailbox (extract facts)',
  schema: {
    input: Schema.Struct({
      mailbox: Type.Ref(Mailbox.Mailbox),
      pageSize: Schema.optional(Schema.Number),
    }),
    output: Schema.Struct({
      processed: Schema.Number,
      facts: Schema.Number,
    }),
  },
  // Resolved at spawn via ServiceResolver.resolveAll.
  services: [AiService.AiService, Database.Service, FactStore.FactStore],
});
```

(Match the exact `Operation.make` field names/style used by the neighboring definitions in this file — e.g. `key`/`name`/`schema` vs whatever the file uses. `FactStore.FactStore` is provided by the Task 5 LayerSpec.)

- [ ] **Step 2: Build**

Run: `moon run plugin-inbox:build`
Expected: PASS (definition compiles; handler added next).

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/plugin-inbox/src/types/InboxOperation.ts
git commit -m "feat(plugin-inbox): EnrichMailbox operation definition"
```

---

## Task 7: `EnrichMailbox` handler (the cursored pipeline)

**Files:**
- Create: `packages/plugins/plugin-inbox/src/operations/enrich/enrich-mailbox.ts`
- Create: `packages/plugins/plugin-inbox/src/operations/enrich/index.ts`
- Modify: `packages/plugins/plugin-inbox/src/capabilities/operation-handler.ts` (register)
- Test: `packages/plugins/plugin-inbox/src/operations/enrich/enrich-mailbox.test.ts`

- [ ] **Step 1: Write the failing test**

Follow `sync.test.ts` (`packages/plugins/plugin-inbox/src/sync/sync.test.ts`) for the DB + feed harness.

```ts
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';
import { Database, Feed, Ref } from '@dxos/echo';
import { FactStore } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';
import { Mailbox } from '../../types';
import enrichMailbox from './enrich-mailbox';

describe('EnrichMailbox', () => {
  const seed = ['Alice owes Bob five dollars.', 'Carol will send the report Friday.'];

  test('indexes facts for each feed message and advances the cursor; re-run skips', ({ expect }) =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const feed = Feed.make();
      const mailbox = Mailbox.make({ feed: Ref.make(feed) });
      db.add(mailbox);
      yield* Effect.promise(() =>
        db.appendToFeed(feed, seed.map((text, i) => Message.make({
          sender: { email: `s${i}@x.com` },
          created: new Date(2020, 0, 1 + i).toISOString(),
          blocks: [{ type: 'text', text }],
        }))),
      );

      const first = yield* enrichMailbox.handler({ mailbox: Ref.make(mailbox) });
      expect(first.processed).toBe(2);
      expect(first.facts).toBeGreaterThan(0);

      const store = yield* FactStore.FactStore;
      const before = (yield* store.query({})).length;
      const second = yield* enrichMailbox.handler({ mailbox: Ref.make(mailbox) });
      const after = (yield* store.query({})).length;
      // Within the same store/session, the second run's cursor skip reprocesses nothing new.
      expect(second.processed).toBe(0);
      expect(after).toBe(before);
    }).pipe(
      // Provide: Database test layer (per sync.test.ts), FactStore.layerMemory, and a stub AiService
      // whose extraction yields ≥1 deterministic fact per non-empty message.
      Effect.provide(/* TestLayer with FactStore.layerMemory + stub AiService */ undefined as any),
      Effect.runPromise,
    ));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-inbox:test -- src/operations/enrich/enrich-mailbox.test.ts`
Expected: FAIL — handler not implemented.

- [ ] **Step 3: Implement the handler**

Assemble the pipeline: `Feed.query` source → `dedupStage` → `extractFactsUnitStage` → `grouped` → `Pipeline.run({ sink: factsCommit })`, providing the `DerivedBinding` state (feed omitted; `cursorKey = 0` per D5), `FactStore`, and the `FactIndexer` built over `AiService`.

```ts
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Relation } from '@dxos/echo';
import { Pipeline, Stage } from '@dxos/pipeline';
import { extractFactsUnitStage } from '@dxos/pipeline-email';
import { FactStore, RDF } from '@dxos/pipeline-rdf';
import { messageSource } from '@dxos/pipeline-email'; // if messageSource is exported; else re-derive
import { DerivedBinding, SyncBinding } from '@dxos/plugin-connector';
import { Cursor, Message } from '@dxos/types';
import { InboxOperation, Mailbox } from '../../types';
import { buildFactIndexer } from './fact-indexer'; // small helper: (aiService, store) => FactIndexer

const handler = InboxOperation.EnrichMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, pageSize = InboxOperation.DEFAULT_ENRICH_MAILBOX_PAGE_SIZE }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const store = yield* FactStore.FactStore;
      const aiService = yield* AiService.AiService;

      // Find-or-create the DerivedBinding for (feed → mailbox); reuse across runs so its cursor persists.
      const binding = yield* findOrCreateDerivedBinding(mailbox, feed);

      // Phase-1: in-memory store ⇒ cursorKey starts at 0 each session (see design D5). Remove when the
      // store is durable (worker/OPFS SQLite).
      const state = yield* SyncBinding.makeStateForTest({
        binding,
        foreignKeySource: 'inbox.facts',
        cursorKey: 0,
        stats: { newMessages: 0 },
      });

      const extract = buildFactIndexer(aiService, store);
      let processed = 0;
      let factCount = 0;

      yield* Feed.query(feed, Filter.type(Message.Message)).run.pipe(
        Effect.map((messages) => Stream.fromIterable(messages)),
        Effect.flatMap((source) =>
          source.pipe(
            SyncBinding.dedupStage('facts-dedup', (m: Message.Message) => messageSource(m), (m) => Date.parse(m.created)),
            extractFactsUnitStage(extract),
            Stage.map('tally', (unit) => Effect.sync(() => { processed += 1; factCount += unit.facts.length; return unit; })),
            Stream.grouped(pageSize),
            Pipeline.run({ sink: /* factsCommit */ (page) => FactCommit.factsCommit(page) }),
            Effect.provideService(SyncBinding.Service, state),
          ),
        ),
      );

      return { processed, facts: factCount };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
```

Add the `fact-indexer.ts` helper and `findOrCreateDerivedBinding` (query the mailbox's child relations for an existing `DerivedBinding`; else `DerivedBinding.make({ source: feed, target: mailbox })` + `db.add`). Register the handler in `operation-handler.ts` alongside the existing inbox handlers.

> Note on `dedupStage` counting: `processed` counts items that survived dedup (i.e. newly processed), so the re-run assertion (`processed === 0`) holds. If you want "seen" vs "new" separately, add a second counter before `dedupStage`.

- [ ] **Step 4: Run the test**

Run: `moon run plugin-inbox:test -- src/operations/enrich/enrich-mailbox.test.ts`
Expected: PASS.

- [ ] **Step 5: Build + lint**

Run: `moon run plugin-inbox:build && moon run plugin-inbox:lint -- --fix`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/operations/enrich packages/plugins/plugin-inbox/src/capabilities/operation-handler.ts
git commit -m "feat(plugin-inbox): EnrichMailbox handler — cursored fact indexing over the feed"
```

---

## Task 8: Relocate `FactViewer` into `@dxos/react-ui-fact-viewer`

`FactViewer` is pure/presentational and must be importable by plugin-inbox. Move it + its presentational helpers out of stories-brain (no re-export shim, per repo rules).

**Files:**
- Create: `packages/ui/react-ui-fact-viewer/{package.json,moon.yml,tsconfig.json,src/index.ts,src/FactViewer.tsx,src/types.ts}`
- Modify: `packages/stories/stories-brain/src/components/index.ts` + story imports
- Delete: `packages/stories/stories-brain/src/components/FactViewer/*` (component; keep/relocate its story)
- Test: keep `FactViewer.stories.tsx` (moved) as the smoke check.

- [ ] **Step 1: Scaffold the package**

Create `packages/ui/react-ui-fact-viewer/package.json` with `"private": true` (mandatory for new packages), name `@dxos/react-ui-fact-viewer`, and deps: `@dxos/pipeline-rdf` (`workspace:*`), `@dxos/react-ui` (`workspace:*`), `@dxos/react-ui-graph` (`workspace:*`), `@dxos/react-ui-list` (`workspace:*`), `@dxos/ui-theme` (`workspace:*`), plus `react` from the catalog. Add `moon.yml` (copy a sibling react-ui package's) and `tsconfig.json` with refs to those deps.

- [ ] **Step 2: Move the source**

Move `FactViewer.tsx` and the helpers it imports from `../types` (`Group, factualityColor, formatDate, formatTerm, graphToTreeNode, groupFacts, termKey`) into `src/FactViewer.tsx` and `src/types.ts`; update the internal import from `../types` to `./types`. `src/index.ts`:

```ts
export * from './FactViewer';
```

- [ ] **Step 3: Repoint stories-brain**

In stories-brain, replace the local `FactViewer` export/usages with imports from `@dxos/react-ui-fact-viewer`; add the dep (`pnpm add --filter @dxos/stories-brain @dxos/react-ui-fact-viewer` — but as a workspace package add it as `workspace:*` in package.json, per repo rule) and a tsconfig ref. Delete the old component files. Move `FactViewer.stories.tsx` into the new package (or keep it in stories-brain importing from the new package — pick one; prefer colocating the story with the component in the new package).

- [ ] **Step 4: Install + build**

Run: `pnpm install --no-frozen-lockfile && moon run react-ui-fact-viewer:build && moon run stories-brain:build`
Expected: PASS. Grep to confirm no dangling imports of the old path:

Run: `git grep -n "components/FactViewer" packages/stories/stories-brain/src`
Expected: no results.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui-fact-viewer packages/stories/stories-brain pnpm-lock.yaml
git commit -m "refactor(react-ui-fact-viewer): extract FactViewer into a reusable package"
```

---

## Task 9: Mailbox companion surface + container

**Files:**
- Create: `packages/plugins/plugin-inbox/src/containers/MailboxFactsCompanion/{MailboxFactsCompanion.tsx,index.ts}`
- Modify: `packages/plugins/plugin-inbox/src/capabilities/react-surface.tsx` (register companion)
- Modify: plugin-inbox `package.json` (add `@dxos/react-ui-fact-viewer` as `workspace:*`) + tsconfig ref
- Test: `packages/plugins/plugin-inbox/src/containers/MailboxFactsCompanion/MailboxFactsCompanion.test.tsx`

- [ ] **Step 1: Write the failing test**

A render smoke test: given a `FactStoreRegistry` capability whose store has seeded facts, the container renders `FactViewer` with those facts. Use the plugin's existing container test setup (see any `*.test.tsx` under `plugin-inbox/src/containers`), providing the capability via the test plugin harness.

```tsx
import { render, screen } from '@testing-library/react';
import { describe, test } from 'vitest';
import { MailboxFactsCompanion } from './MailboxFactsCompanion';
// Wrap with the inbox test providers that supply the FactStoreRegistry capability with seeded facts.

describe('MailboxFactsCompanion', () => {
  test('renders FactViewer with the mailbox facts', ({ expect }) => {
    render(/* <Providers facts=[…]> */ <MailboxFactsCompanion mailbox={/* mailbox */ undefined as any} /> /* </Providers> */);
    expect(screen.getByPlaceholderText('Filter by entity or predicate…')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run plugin-inbox:test -- src/containers/MailboxFactsCompanion/MailboxFactsCompanion.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the container**

```tsx
import React, { useMemo } from 'react';
import { useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';
import { FactViewer } from '@dxos/react-ui-fact-viewer';
import { type Mailbox } from '../../types';
import { InboxCapabilities } from '../../types';

export type MailboxFactsCompanionProps = { mailbox: Mailbox.Mailbox };

export const MailboxFactsCompanion = ({ mailbox }: MailboxFactsCompanionProps) => {
  const registry = useCapability(InboxCapabilities.FactStoreRegistry);
  const spaceId = getSpace(mailbox)?.id ?? 'default';
  const store = useMemo(() => registry.forSpace(spaceId), [registry, spaceId]);
  // Phase 1: read once. Deep reactivity (re-query as the pipeline writes) is a follow-up.
  const facts = useMemo(() => store.querySync?.({}) ?? [], [store]);
  return <FactViewer facts={facts} />;
};
```

> If `FactStoreApi.query` is Effect-only (no sync variant), add a `querySync` to the memory layer, or run the Effect in a `useEffect` into state. Keep the read on the shared instance from the registry.

Register the companion in `react-surface.tsx`, mirroring the event companion (`react-surface.tsx:107`):

```tsx
Surface.create({
  id: 'mailbox-facts',
  filter: AppSurface.companion(AppSurface.Article, Mailbox.Mailbox),
  component: ({ data }) => {
    const mailbox = data.subject; // the companion's article subject is the Mailbox
    return Mailbox.instanceOf(mailbox) ? <MailboxFactsCompanion mailbox={mailbox} /> : null;
  },
}),
```

Add the companion node label to the app-graph builder if companions require a registered label (see `plugin-connector/.../app-graph-builder.ts:146` for the pattern).

- [ ] **Step 4: Run the test**

Run: `moon run plugin-inbox:test -- src/containers/MailboxFactsCompanion/MailboxFactsCompanion.test.tsx`
Expected: PASS.

- [ ] **Step 5: Build + lint**

Run: `pnpm install --no-frozen-lockfile && moon run plugin-inbox:build && moon run plugin-inbox:lint -- --fix`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-inbox/src/containers/MailboxFactsCompanion packages/plugins/plugin-inbox/src/capabilities/react-surface.tsx packages/plugins/plugin-inbox/package.json pnpm-lock.yaml
git commit -m "feat(plugin-inbox): Mailbox companion surface rendering FactViewer from shared FactStore"
```

---

## Task 10: End-to-end verification + cast audit

- [ ] **Step 1: Full package builds + tests**

Run:
```bash
moon run plugin-connector:test pipeline-email:test plugin-inbox:test react-ui-fact-viewer:build stories-brain:build
```
Expected: all PASS.

- [ ] **Step 2: Cast audit (repo rule)**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no *new* casts except justified type-system-boundary ones. The registry's `Layer.build` materialization (Task 5) may need one boundary cast — if so, add a concise comment saying why no typed alternative exists, or refactor to the LayerSpec-direct approach noted in Task 5. Remove all others.

- [ ] **Step 3: Format**

Run: `pnpm format`
Expected: clean.

- [ ] **Step 4: Manual smoke (optional, if a dev server is wired)**

Verify the companion appears on a Mailbox and populates after invoking `EnrichMailbox`. If no runnable path exists yet (operation invoked only from tests), note that and rely on the test suite.

- [ ] **Step 5: Final commit (if formatting/lint changed anything)**

```bash
git add -A
git commit -m "chore(plugin-inbox): format + lint EnrichMailbox fact-indexing"
```

---

## Self-Review notes

- **Spec coverage:** D1/D2 → Tasks 1–2; D3 → Task 3 (cursor-key comment) + Task 7 (`cursorKey=0`); D4 → Tasks 3–4; D5 → Task 5 (+ Task 7 reset); D6 → Tasks 8–9. Testing section → each task's tests + Task 10. Future/worker durability is explicitly out of scope (documented in spec).
- **Type consistency:** `FactUnit` (Task 3) is consumed by `factsCommit` (Task 4) and produced in the handler (Task 7). `CursorHolder`/`makeStateForTest` (Task 1) are used by `factsCommit` test (Task 4) and the handler (Task 7). `FactStoreRegistry.forSpace` (Task 5) is used by the container (Task 9). `messageSource` is reused from pipeline-email in Tasks 3 and 7 — confirm it is exported from `@dxos/pipeline-email`; if not, export it in Task 3.
- **Known soft spots to resolve during execution (not placeholders — flagged decisions):** (a) exact `Operation.make` field names must match neighbors in `InboxOperation.ts`; (b) the memory-layer materialization in Task 5 (`Layer.build` vs LayerSpec-direct) — pick whichever keeps one-instance-per-space without a cast; (c) `FactStoreApi.query` sync vs Effect in the container (Task 9).
