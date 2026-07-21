# Fact Store — Tasks

_Resume: Resolve the 5 open questions with the user before implementation. Uncommitted: TASKS.md + registry entry + spec (this scaffold). Last: branch synced to main, project created._

Dialog-inspired append-only fact store: keep Dialog DB's triple data model
(`{the, of, is}` facts, retraction not deletion, covering indexes, history
preservation) while replacing its replication model with `@dxos/feed` — the log
is the replicated artifact, the index is derived local state. Zero new protocol
surface.

Design: [`agents/superpowers/specs/2026-07-13-fact-store-design.md`](../../../agents/superpowers/specs/2026-07-13-fact-store-design.md)

## Phase 0: Finalize spec

Lock the open questions before code so the schema and index layout are stable.

### Tasks

- [ ] **Resolve open questions with the user** (spec §Open questions)
  - Naming: `Fact` namespace + `Fact.Base` handle vs `Claim`/`Datom`; handle name.
  - Value set: are `bytes` / nested JSON needed in v1, or scalars + `ref` only?
  - Attribute discipline: free-form strings vs optional attribute-metadata facts.
  - One feed per `Fact.Base` vs a shared base-scoped feed.
  - Re-fold strategy when positions arrive out of provisional order.

## Phase 1: Data model + `Fact` surface (`@dxos/echo`)

`Fact.ts` as a `// @import-as-namespace` veneer over `Database.Service`, mirroring
`Feed.ts` conventions.

### Tasks

- [ ] **Schemas** — `Value` union (tagged scalars + `ref`), `Statement`, `Commit`
      (versioned `org.dxos.type.fact-commit`), `Base` (`org.dxos.type.fact-base`).
- [ ] **Value constructors** — `Fact.string`/`number`/`ref`/… helpers.
- [ ] **Write ops** — `Fact.make`, `Fact.assert`, `Fact.retract`, `Fact.update`
      (retract-head+assert sugar), each one atomic commit via `Feed.append`.
- [ ] **Selector API** — `Fact.select({ the?, of?, is? })` returning the standard
      `QueryResult` contract; `Fact.history(...)`; `Fact.sync`/`getSyncState`
      delegating to `Feed`.

## Phase 2: `DatomIndex` engine (`@dxos/index-core`)

Fourth index beside `FtsIndex`/`ReverseRefIndex`/`EntityMetaIndex`, fed by the
existing `FeedDataSource` → `IndexEngine` path.

### Tasks

- [ ] **Tables** — `datoms` (full history + EAV/AEV/VAE covering indexes) and
      `heads` (live projection + AVE/VAE).
- [ ] **Ingest fold** — per commit, in feed-position order, one SQL txn: insert
      datoms, delete retracted heads, upsert asserted heads.
- [ ] **Selector → SQL** — compile each `(the?, of?, is?)` shape to its covering
      index.
- [ ] **Re-fold on out-of-order positions** — rebuild affected `(e, a)` lineages
      from `datoms` (per Phase 0 decision).

## Phase 3: echo-db plumbing + reactivity

### Tasks

- [ ] **Fact-selector query kind** — client → echo-db → index (dedicated service
      method for v1; `QueryAST` extension deferred).
- [ ] **Datom-level invalidation** — `IndexingResult` emits affected
      `(baseId, e)` / `(baseId, a)` keys.
- [ ] **Reactivity** — wire `DatomIndex` invalidations into the index→atom path so
      `Fact.select` results are subscribable like `Feed.query`.
- [ ] **Position visibility** — expose carrying-block `position` + assignment
      notifications to the indexer (the one likely genuine `index-core` interface
      change).

## Phase 4: Sync + convergence tests

### Tasks

- [ ] **Delegated sync** — verify `Fact.sync`/`getSyncState` ride the existing
      edge `SyncClient`/`SyncServer` path unchanged.
- [ ] **Convergence property test** — N interleaved writers → M replicas with
      sequencer-assigned positions; all `heads` tables byte-identical and equal to
      a sequential single-writer reference fold.

## Phase 5: Tests, docs, changeset

### Tasks

- [ ] Unit tests for assert/retract/update semantics, revival, multi-valued sets.
- [ ] `.changeset/*.md` (new `@dxos/echo` + `@dxos/index-core` surface).
- [ ] API docs / examples for the `Fact` namespace.

## References

- Spec: `agents/superpowers/specs/2026-07-13-fact-store-design.md`
- Dialog DB: https://github.com/dialog-db/dialog-db (data model reference)
- `Feed.ts` in `@dxos/echo` — surface/veneer convention to mirror.
