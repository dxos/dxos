# effect-smol — Tasks

_Resume: Phase 2 — blocked on `effect` GA. Uncommitted: none. Last: Phase 1 complete (d79d6bad routes 77 files through the `@dxos/effect` SchemaAST facade; corpus + migration + shape-pin tests green)._

Migrate `dxos/dxos` from Effect 3 to Effect 4, then `dxos/edge`. The _why_, the decisions
(D1–D7) and the findings (F1–F4) live in [DESIGN.md](./DESIGN.md) — this file is the ledger.

Blocked on `effect` GA: v4 is at `4.0.0-beta.105` with no stable release. Phases 0–1 are
deliberately doable on v3 today.

## Phase 0: Audit and spike — DONE

Establish the size of the problem and de-risk the two unknowns (persisted schemas, the AST).

### Tasks

- [x] **Audit Effect usage across the monorepo** — 2,884/10,456 files, 208/322 packages, per-module
      import counts, ecosystem v4 availability. Numbers in DESIGN.md §Scope.
- [x] **Resolve the `@effect-atom` question** (D2) — absorbed into the v4 train
      (`effect/unstable/reactivity` + `@effect/atom-react@4`); every symbol in use is covered.
- [x] **Port `@dxos/effect`'s `ast.ts` to the v4 AST** — 449 LOC, public API only, clean `tsc`.
      `agents/superpowers/spikes/effect-4-schema-ast/src/ast.ts`.
- [x] **Write the v3-persisted → v4 decoder** — 279 LOC, 20 tests over a fixture generated from
      `@dxos/echo` on HEAD (not hand-written). Handles the v3-only sentinels (`/schemas/any`,
      `/schemas/unknown`, `/schemas/{}`), `/schemas/echo/ref`, `propertyOrder`, both annotation
      namespaces.
- [x] **Size the write path** — v4's emitter is not a drop-in; `SchemaRepresentation` round-trips
      losslessly instead (needs a `representation` annotation on declarations + explicit revivers).
- [x] **Mixed-format dispatch** (D4) — `src/dispatch.ts`, 5 tests; formats are structurally
      distinguishable, and the v3 → v4 rewrite is lossless for identity, optionality, validation
      and the ECHO `Ref` DXN.
- [x] **Confirm EDGE's schema surface** (D6) — writes zero types, reads zero stored schemas;
      needs no compat decoder.
- [x] **Confirm the release mechanism** (D7) — EDGE consumes `@dxos/*` from pkg.pr.new at a commit
      SHA; no npm publish or local link needed.

### References

- Spike + full findings: `agents/superpowers/spikes/effect-4-schema-ast/REPORT.md`
- Branch `claude/effect-4-migration-audit-pq2m8z`, commits `275d4fc6`, `082684f4` (no PR — user
  asked for none).

## Phase 1: De-risk on v3 — DONE

Work that pays off whether or not v4 ever lands, and shrinks Phase 3 materially. All done on v3.

### Tasks

- [x] **Consolidate `effect/SchemaAST` importers behind `@dxos/effect`** — commit `d79d6bad`.
  - New curated facade `packages/common/effect/src/internal/schema-ast.ts` re-exports the 60
    symbols actually used, surfaced as `SchemaAST` from the package index.
  - 77 consumer files across 26 packages repointed; the only direct importers left are the 4
    inside `@dxos/effect` itself. F1's blast radius drops from 80 files to one module.
  - Added `@dxos/effect` to the five packages that lacked it (`react-ui-canvas-editor`,
    `introspect-tools`, `plugin-thread`, `echo-protocol`, `compute-hyperformula`); no cycle.
  - 180 moon build tasks green across all 27 touched projects; `effect`/`echo`/`schema`/
    `conductor`/`echo-panproto` tests green.
- [x] **Pin the LLM-facing `toJsonSchema` output shape** (D5, F4)
  - `packages/core/echo/echo/src/internal/JsonSchema/json-schema-shape.test.ts`, 5 tests.
  - Pins what the readers depend on: constraints and `description` at the TOP LEVEL of each
    property (not nested under `allOf`), optional fields as the bare type omitted from
    `required` (not `anyOf: [T, null]`), literal unions as a flat `enum`, and a flat document
    with no `$ref`/`definitions`. Full echo suite green (493 passed).
- [x] **Prototype the `org.dxos.type.schema` `0.1.0` → `0.2.0` migration**
  - `spike/src/migration.ts` + `test/migration.test.ts` (5 tests). Idempotent by construction —
    an already-v4 payload is returned by identity, so a re-run, or a space another peer already
    migrated, is a no-op. Verified across the whole corpus, including a half-migrated space.
  - Only the transform is modelled; wiring to `Migration.define` / `Database.runMigrations`
    needs a live database and belongs in Phase 2.
- [x] **Sweep EDGE for transitive consumers of `toJsonSchema` output**
  - Exactly one: `ai-service/src/generation/tools/types.ts:73`. The `graphQuery/cypher`
    `.properties[...]` hits are Cypher graph data, not JSON Schema. The shape contract does
    extend past that call into the model-provider SDK via `parameters:`.
- [x] **Validate the decoder against a real corpus**
  - `corpus-v3.json`: all 18 ECHO types exported by `@dxos/types` (Person, Organization, Message,
    Task, Event, Transcript, Thread, Channel, File, Outline, 5 relations, …), emitted by
    `toJsonSchema` on effect 3.21.4 — 38 refs, 43 enums, 14 patterns, both `/schemas/*` sentinels.
  - `test/corpus.test.ts`, 73 tests: every type decodes to `Objects`, keeps its declared property
    set and per-property optionality, keeps its type identity, and survives a v3 → v4 rewrite
    with an unchanged property shape.
- [x] **Apply Tier 1 renames that v3 already supports** — **not applicable, nothing to do.**
  - Checked every v4 target name against `effect@3.21.4`: `Effect.catch`, `result`, `callback`,
    `catchCause`, `catchDefect`, `tapCause`, `Layer.tapCause`, `Stream.catch`, `result`,
    `fromEffectRepeat`, `catchCause`, `Scope.provide` are all absent.
  - The three that DO exist are semantic traps, not free renames: v3's `Effect.catchIf` is
    predicate-based recovery (not v4's `catchSome` replacement), and v3's `Layer.effect` /
    `effectDiscard` are distinct from `Layer.scoped` / `scopedDiscard` (v4 merges them because
    every layer is scoped). Renaming any of them on v3 would change behaviour.

### References

- Spike now at 106 tests: `agents/superpowers/spikes/effect-4-schema-ast/`.

## Phase 2: Migrate dxos/dxos

Gated on `effect` GA (or an explicit decision to ride the beta).

### Tasks

- [ ] **Tier 1 — mechanical rewrites** (~2–3 wks): module paths, API renames, the 433 atom files.
- [ ] **Tier 2 — services and runtime** (~3–6 wks): `Context.Tag` → `ServiceMap.Service` (126 class
      decls), `ManagedRuntime`/`Runtime<R>` (`RuntimeProvider`, `dynamic-runtime`), `Cause`,
      forking, `FiberRef` → `Context.Reference`.
- [ ] **Tier 2 — layer memoization audit** (F3)
  - Shared MemoMap across `Effect.provide` produces no compile errors, only shared-instance bugs.
  - Audit `Layer.succeed`/`effect`/`mergeAll` sites and the composition convention; add
    `Layer.fresh` where isolation was implicit.
- [ ] **Tier 3 — Schema rewrite** (~6–12 wks): call-site migration plus `ast.ts`,
      `schema-validator.ts`, `json-schema.ts`, `react-ui-form`.
- [ ] **Add the annotation-resolver lint rule** (F2) — reading `ast.annotations` directly is wrong
      for any refined type.
- [ ] **Remove the spike's `as any` casts** before any of it ships (6 in `src/`, at the
      dynamic-schema boundary; the v3 code has the same casts in the same places).
- [ ] **Dispatch pkg.pr.new on the branch** (D7) — `workflow_dispatch`, since the workflow only
      auto-triggers on `main`.

## Phase 3: Migrate dxos/edge

### Tasks

- [ ] **Repoint `catalog:dxos` at the dxos branch SHA** (`edge:pnpm-workspace.yaml:104`).
- [ ] **Migrate EDGE to v4** — no compat decoder needed (D6).
- [ ] **Verify the ai-service tool-schema path** still passes its description check (F4).

## Phase 4: Ship

Order matters — EDGE ships before Composer.

### Tasks

- [ ] **Land the dxos PR; do not ship Composer.**
- [ ] **Repoint edge at the landed SHA; land and ship EDGE.**
- [ ] **Ship Composer with the type migration** (D4).
- [ ] **Retire the v3 decoder** — gated on space coverage, not a release date; a space nobody opens
      keeps v3 documents indefinitely.

## Open questions

- [ ] Ride the beta, or wait for `effect` GA? No GA after ~6 months and 105 betas.
- [ ] `effect/unstable/*` has no semver guarantee even post-GA — acceptable for `cli`, `rpc`, `sql`,
      `ai`, `reactivity`?
- [ ] Is `packages/common/effect-atom-solid` deletable in favour of `@effect/atom-solid`?
