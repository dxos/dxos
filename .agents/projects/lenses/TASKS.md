# ECHO Lenses — Tasks

_Resume: Phase 0 — spike `@panproto/core` (WASM) loadability, the Task→GTD law-check, **target-type derivation from a spec (D1)**, and mdast source-offset splicing. Those answers pick the architecture. Uncommitted: none. Last: DESIGN.md rewritten around lenses as a first-class ECHO concept (static or persisted, mirroring `Type`) with derivation graded honestly in §3._

Design and rationale live in [DESIGN.md](./DESIGN.md); proposed signatures in [API.md](./API.md).
This file is the ledger only.

**The bar for "done" on both lenses:** a custom UI drives the object entirely through the lens
schema, all data persists in the base object under its own schema plus annotations, and a second
peer on the canonical UI collaborates with it live, in both directions.

**The derivation goal:** nobody hand-writes the derived type (D1), the overlay set, the write
path, or the test instances. See DESIGN.md §3 for what that does and doesn't reach.

## Phase 0: Spikes

Cheap, independent, architecture-deciding. Nothing else starts first.

### Tasks

- [ ] **Load `@panproto/core` in each target** — node (test runner), browser (vite), and
      `workerd`. ECHO runs in a shared worker; a WASM module that can't load there changes the
      architecture. Record size and cold-start in DESIGN.md §8.1.
- [ ] **Verify the TS SDK surface** listed in DESIGN.md §4 against the real package. Correct the
      design doc wherever the book and the package differ.
- [ ] **D1 spike — derive a target type from a spec.** `JsonSchema.toJsonSchema(DataType.Task)` →
      apply spec → target JSON Schema → `Type.makeObjectFromJsonSchema`. Confirm ECHO annotations
      that the UI depends on (`PropertyMetaAnnotationId` SingleSelect options, `FormatAnnotation`,
      refs) survive derivation — a derived SingleSelect that loses its options renders as a bare
      string field (DESIGN.md §8.2). **This is the spike that decides whether the whole
      derive-don't-write premise holds.**
- [ ] **Hand-author the Task→GTD lens** as a spec; run `checkLaws` over instances generated from
      the source type's `GeneratorAnnotation`s (`createProps`, `@dxos/schema/testing`), including
      the lossy `status` split. Go/no-go for the declarative path.
- [ ] **D3 reality check** — run panproto's `lens generate` on `Task` vs a hand-written GTD target
      schema. Record exactly which correspondences it recovers and which holes it leaves; confirm
      the §3 D3 claim that value semantics (`done === status === 'done'`, `estimate / 60`) are not
      recoverable. Cheap, and it calibrates how much of D3 to build.
- [ ] **mdast offset spike** (DESIGN.md §5.B) — parse a real document, confirm block nodes carry
      usable `position.*.offset`, edit one block, splice it back, assert the rest is
      byte-identical. Throwaway node script, no ECHO.
- [ ] **Decision: engine-in-runtime vs author-time-only.** Write it into DESIGN.md §8.1 with
      measured numbers, then delete the losing branch from the design.

## Phase 1: Core — the first-class surface

No UI. Tests are the consumer. Shaped as a namespace module from day one so promotion into
`@dxos/echo` is a move, not a redesign (DESIGN.md §2.1).

### Tasks

- [ ] **Scaffold `packages/sdk/lens` (`@dxos/lens`, `"private": true`)**; in-repo deps
      `workspace:*`, external via catalog. Keep the panproto/WASM binding in a separate optional
      package so core stays worker-safe.
- [ ] **`Lens` interface + `org.dxos.type.lens` entity** (DESIGN.md §6.1, API.md §2–3), with both
      definition paths — static (code) and persisted (space) — mirroring `Type` / `Type.Type`. An
      ordinary ECHO object, **not** a new `EntityKind` (API.md §0).
- [ ] **`Write` vocabulary** (API.md §1) — `assign` | `splice` | `overlay`, with no whole-object
      replace expressible. This is where write-minimality becomes a type error rather than a rule.
- [ ] **Resolve `Obj.lens` proxy vs a distinct `LensedObj<T>`** (API.md §5.2, §10.1) — decide with
      the Phase 4 collaboration story in hand, not before.
- [ ] **`Lens.derive(baseType, lens)` (D1)** — spec applied to source JSON Schema → target `Type`
      entity. The stored `target` is a cache; add a test asserting cache == fresh derivation.
- [ ] **Bind mode — `Lens.between(Source, Target, mapping)`** (API.md §2.1). The primary authoring
      direction: both schemas exist, the mapping is partial, unmapped target properties overlay
      **automatically** with no declaration and no error.
- [ ] **Derived overlay set (D4)** — target properties the mapping doesn't cover; no hand-maintained
      list. Default is `store`, not `reject`.
- [ ] **`Lens.coverage`** (API.md §2.4) — mapped / overlaid / dropped, plus `suspicious`: an
      overlaid property with a plausible source counterpart. Never auto-overlay that case — it
      records the same fact twice and the copies drift.
- [ ] **`Lens.promote(obj, lens)`** — drain overlay values into base properties that now exist,
      idempotent. Required by the migration use case, not backlog.
- [ ] **Target typename identity** — `Obj.getTypename` on a lensed object returns the _target's_
      typename so existing surfaces resolve, while `Obj.getURI` still resolves to the base object
      (API.md §2.2). Plus `Lens.sourcesFor(Target)` reverse lookup.
- [ ] **`put` totality audit for bind mode** — a UI written for the target will write anything the
      target schema permits; every property needs a real inverse, an overlay, or an explicit
      read-only marking the form honours. A silently dropped write is the worst outcome.
- [ ] **T1 snapshot codec** — `get(obj)` / `put(view, obj)` in one `Obj.update`.
- [ ] **T2 minimal-write** — diff the view, map changed paths back through the compiled table,
      assign only those (DESIGN.md §6.4). Non-pointwise specs fall back to T1 and are barred from
      collaborative surfaces.
- [ ] **Overlay storage** — `LensOverlay` annotation keyed lens DXN → property; validate each
      value against the derived target; `reject` default.
- [ ] **`Lens.checkLaws` harness (D4)** — property-based, instances from `GeneratorAnnotation`,
      usable by both declarative and coded lenses.
- [ ] **Registry** — resolve static and space-stored lenses by source typename.

## Phase 2: Task → GTD lens

### Tasks

- [ ] **`lenses/task-gtd.ts`** per the mapping table in DESIGN.md §5.A (status split, priority
      convert, estimate unit convert, `context`/`waitingOn` overlay).
- [ ] **Unit tests** — round-trip, laws, overlay persistence, and an explicit test that a lensed
      write touches _only_ the changed properties.
- [ ] **Lensed UI** — a `Form` rendered from the **derived** target schema, importing no
      `DataType.Task`.
- [ ] **Reactive read path** — composed `Obj.atom` + `Annotation.atom`, no over-firing.

## Phase 3: Text → rich text lens

Gated on the Phase 0 mdast spike.

### Tasks

- [ ] **`get`** — `Text.content` → remark/remark-gfm → mdast → normalized block tree, each node
      carrying its source range.
- [ ] **`put`** — serialize the edited block only, apply via `Text.splice` over that exact range;
      never rewrite `content`.
- [ ] **Complement holds the per-node source slice** so untouched blocks round-trip
      byte-identically.
- [ ] **Block list UI** — typed row per block (heading + level control, paragraph, list). Not a
      WYSIWYG; scope guard in DESIGN.md §5.B.
- [ ] **Tests** — round-trip fidelity on a document exercising both bullet styles, both heading
      styles, and reference links; byte-identical assertion after a single-block edit.

## Phase 4: Stories

The deliverable. `packages/stories/stories-lens`. Four stories, all with `play` functions so CI
enforces them (DESIGN.md §7).

### Tasks

- [ ] **Shared raw-inspector component** — live base-object JSON + `Obj.getMeta(obj).annotations`.
      The proof-of-persistence pane; both single-peer stories use it.
- [ ] **Story: Task, lensed** — lensed form | canonical form | raw inspector, one peer.
- [ ] **Story: Text, lensed** — block list | CodeMirror editor | raw inspector, one peer.
- [ ] **Story: Task, collaborative** — `withMultiClientProvider({ numClients: 2, createSpace:
true })`, canonical UI in pane 0, lensed UI in pane 1, same object via a real invitation.
  - `status` change on A propagates to `done`/`stage` on B, and back.
  - Overlay set on B persists, is invisible on A's form, appears in A's inspector annotations.
  - **Concurrent non-conflicting edits merge** (A edits `title` while B toggles `done`) — the
    assertion that fails if write-minimality is violated.
- [ ] **Story: Text, collaborative** — canonical CodeMirror in pane 0, block list in pane 1.
  - A types in one block while B edits a different block; both survive.
  - Untouched markdown is byte-identical after B's edit.

## Phase 5: Toward first-class

Only after the two lenses and four stories land — the model earns core placement by being proven,
not by being planned.

### Tasks

- [ ] **Promote into `@dxos/echo`** — `Lens` module beside `Type`/`View`/`Annotation`; engine and
      coded-lens packages stay outside core (DESIGN.md §2.1). Update every call site; no
      compatibility re-exports.
- [ ] **`Obj.lens(obj, lens)`** as the ergonomic entry point.
- [ ] **Typed combinator builder (D2)** — static lenses with compile-time target types, emitting
      the same spec data. Only after the op set has settled; the op set must not be driven by what
      is convenient to type.
- [ ] **`Lens.generate` (D3)** — draft spec + explicit unresolved holes, law-invalid until filled;
      LLM/MCP assist for the holes. Scope set by the Phase 0 D3 reality check.
- [ ] **Richer source annotations** so more of D3 is derivable — starting with units (`estimate`
      records no unit, so the factor 60 is not inferable by anything). Useful independent of this
      project.

## Phase 6: Backlog

- [ ] Stable block identity via Automerge cursors, replacing per-parse ephemeral ids.
- [ ] Agent surface — lensed serialization for tools, writes validated through `put`.
- [ ] External-protocol lenses (Linear / GitHub / ATProto lexicon) replacing hand-written
      connector mappers.
- [ ] Third example lens exercising **bind mode** end to end (a foreign type adapted to
      `DataType.Task`), proving existing surfaces render it unchanged. Promotion itself moved to
      Phase 1.
- [ ] Lens **retirement** — detect a lens whose mapping has collapsed to identity with an empty
      overlay set (its migration finished) and remove it rather than leave permanent indirection.
- [ ] Querying _through_ a structural lens (rewrite `Filter` on lensed property names).
- [ ] Read-only lens as a redaction/capability boundary.
- [ ] Lens versioning when the base type migrates — including whether the target re-derives
      automatically (DESIGN.md §8.7).
- [ ] Dropped from scope: Organization → schema.org lens.

## References

- [DESIGN.md](./DESIGN.md) — first-class API (§2), derivation graded D1–D4 (§3), the two lenses
  (§5), model and concurrency rule (§6), the four stories (§7).
- panproto: https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  toolkit https://github.com/panproto/panproto-toolkit
