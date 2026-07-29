# ECHO Lenses — Tasks

_Resume: Phase 0 — spike the engine's law-check surface (`checkLaws`/`GetResult`), mapping-resolution strictness, the Task→GtdTask law-check, and mdast source-offset splicing; then Phase 1 in `@dxos/echo-panproto`. Uncommitted: none. Last: merged main to pull in PR #12395 (`@dxos/echo-panproto`: wire lens + runner + verified `@panproto/core@0.56.1` wasm engine) and rebased the plan on it — the object lens lands there as a new `Lens` namespace export._

Design and rationale live in [DESIGN.md](./DESIGN.md); proposed signatures in [API.md](../../../packages/core/echo/echo-panproto/API.md).
This file is the ledger only.

**Scope: proof of concept.** The payoff being chased is _multiple interfaces, each written against
its own schema, driving the same object_. Migration support (`Lens.promote`) and lens generation
are long-term, recorded in the backlog, and not built here.

**The bar for "done" on both lenses:** a custom UI drives the object entirely through the target
type, all data persists in the base object under its own schema plus annotations, and a second peer
on the canonical UI collaborates with it live, in both directions.

**The authoring goal:** the mapping is the only artifact anyone writes, and it stays short —
matching properties map themselves, unmapped target properties store themselves.

## Phase 0: Spikes

Cheap, independent, architecture-deciding. Nothing else starts first.

### Tasks

- [x] **Engine loadability + SDK surface** — resolved by `@dxos/echo-panproto` (PR #12395):
      `@panproto/core@0.56.1` verified in node (CI) and browser (Composer via plugin-atproto),
      isolated behind the lazy `/wasm` entrypoint so it never enters a static graph. Also learned:
      the shipped TS API is structural-only (no value-expression step) — value conversions are
      host-side named codecs, matching the runner's existing split.
- [ ] **Law-check spike** — the one engine surface `echo-panproto` doesn't exercise: does
      `LensHandle.checkLaws` (or `checkGetPut`/`checkPutGet`) work against 0.56.1, and does `get()`
      return a usable `GetResult { view, complement }`? If not, `Lens.checkLaws` is implemented in
      the runner instead; nothing else moves.
- [ ] **Mapping resolution spike** — explicit entry, then automatic (same name + compatible type),
      then overlay. Settle how strict "compatible" is (DESIGN.md §8.2): optionality mismatches
      should auto-map in the safe direction only; differing enum literals must not auto-map at all.
      Confirm ECHO annotations the UI depends on (`PropertyMetaAnnotationId` SingleSelect options,
      `FormatAnnotation`, refs) are readable on both sides for the compatibility check.
- [ ] **Hand-author the Task→GtdTask mapping** against a written-out `GtdTask` type; run
      `checkLaws` over instances generated from the source type's `GeneratorAnnotation`s
      (`createProps`, `@dxos/schema/testing`), including the lossy `status` split. Go/no-go for the
      declarative path.
- [ ] **mdast offset spike** (DESIGN.md §5.B) — parse a real document, confirm block nodes carry
      usable `position.*.offset`, edit one block, splice it back, assert the rest is
      byte-identical. Throwaway node script, no ECHO.
- [ ] **Decision: where the engine runs for the object lens.** `echo-panproto` settled the pattern
      (lazy `/wasm`, host-side); confirm the object lens needs nothing more — mapping resolution is
      plain TypeScript, the engine consulted only at author/verify time. Record in DESIGN.md §8.1.

## Phase 1: Core — the first-class surface

No UI. Tests are the consumer. Shaped as a namespace module from day one so promotion into
`@dxos/echo` is a move, not a redesign (DESIGN.md §2.1).

### Tasks

- [ ] **Extend `@dxos/echo-panproto` with a `Lens` namespace export** — new modules beside the
      existing `Panproto` wire lens (DESIGN.md §9); built against `@dxos/echo` and
      `@dxos/echo/internal`. The existing `Panproto`/`runner`/`wasm` surface stays untouched.
      React hooks go in a react sibling.
- [ ] **`Lens.make(id, Source, Target, mapping)`** (API.md §1) — the single authoring shape; both
      ends are declared types. Static (code) and persisted (space) definition paths, mirroring
      `Type` / `Type.Type`. An ordinary ECHO object, **not** a new `EntityKind` (API.md §0).
- [ ] **Mapping resolution + shorthands** (API.md §2) — automatic identity mapping for matching
      name/type; bare-string rename; `Lens.from(prop, codec)`; `Lens.readOnly(prop)`; full
      `Derived` form. Keep the vocabulary small and add convenience only where a real mapping is
      verbose.
- [ ] **`Lens.Target<L>` = `Type.InstanceType<Target>`** — assert in a type test that a persisted
      lens targeting a static type still yields the static type (DESIGN.md §3 D2).
- [ ] **`Write` vocabulary** (API.md §6) — `assign` | `splice` | `overlay`, with no whole-object
      replace expressible. This is where write-minimality becomes a type error rather than a rule.
- [ ] **Overlay by default** — target properties nothing maps store themselves in the annotation
      dictionary, validated against the target's declaration for that property. No declaration
      required, `store` default, `reject` opt-in.
- [ ] **`Lens.coverage`** (API.md §2.1) — explicit / automatic / overlaid / dropped, plus
      `suspicious`: a name match with incompatible types, or an overlay resembling a source
      property. Never auto-resolve that case — it records the same fact twice and the copies drift.
- [ ] **Target typename identity** — `Obj.getTypename` on a lensed object returns the _target's_
      typename so existing surfaces resolve, while `Obj.getURI` still resolves to the base object
      (API.md §4.1). Plus `Lens.sourcesFor(Target)` reverse lookup.
- [ ] **`put` totality audit** — an interface written for the target will write anything the target
      schema permits; every property needs a real inverse, an overlay, or `Lens.readOnly` that the
      form renders as visibly non-editable. A silently dropped write is the worst outcome.
- [ ] **T1 snapshot codec** — `get(obj)` / `put(view, obj)` in one `Obj.update`.
- [ ] **T2 live proxy over public internals** — build it from `@dxos/echo/internal` (already a
      declared subpath used by ~20 packages outside core). If it turns out to need a change inside
      `Obj`'s proxy handler, that becomes its own small core PR — the one thing that could force
      core work early (DESIGN.md §2.1).
- [ ] **T2 minimal-write** — diff the view, map changed paths back through the compiled table,
      assign only those (DESIGN.md §6.4). Non-pointwise mappings fall back to T1 and are barred
      from collaborative surfaces.
- [ ] **Overlay storage** — `LensOverlay` annotation keyed lens DXN → property.
- [ ] **`Lens.checkLaws` harness (D4)** — property-based, instances from `GeneratorAnnotation`, run in
      both directions; the reverse pass is what surfaces `put`-totality gaps.
- [ ] **Registry** — resolve static and space-stored lenses by source typename.

## Phase 2: Task → GTD lens

### Tasks

- [ ] **`GtdTask` ECHO type**, written out — the target the lensed UI is built against.
- [ ] **`lenses/task-gtd.ts`** per the mapping table in DESIGN.md §5.A (status split, priority
      convert, estimate unit convert; `title`/`description` automatic; `context`/`waitingOn`
      overlay).
- [ ] **Unit tests** — round-trip, laws, overlay persistence, and an explicit test that a lensed
      write touches _only_ the changed properties.
- [ ] **Lensed UI** — a `Form` rendered from `GtdTask`, importing no `DataType.Task`.
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

- [ ] **Promote into `@dxos/echo`** — move the `Lens` module beside `Type`/`View`/`Annotation` and
      add `Obj.lens(obj, lens)` as the entry point. Call sites change one import line
      (`import { Lens } from '@dxos/echo-panproto'` → `import { Lens } from '@dxos/echo'`); no
      compatibility re-exports left behind. Hooks, engine, and coded lenses stay outside core
      (DESIGN.md §2.1).
- [ ] **Richer source annotations** so more of a mapping is inferable — starting with units
      (`estimate` records no unit, so the factor 60 is not inferable by anything). Useful
      independent of this project.

## Phase 6: Backlog

- [ ] Stable block identity via Automerge cursors, replacing per-parse ephemeral ids.
- [ ] Agent surface — lensed serialization for tools, writes validated through `put`.
- [ ] External-protocol lenses (Linear / GitHub / ATProto lexicon) replacing hand-written
      connector mappers.
- [ ] **Foreign-type adaptation** — a third lens mapping an external type onto `DataType.Task`,
      proving existing `Task` surfaces render it unchanged.
- [ ] **Migration support** — `Lens.promote(obj, lens)` draining overlay values into base properties
      that now exist, plus a policy for the window where a field is queryable for some objects and
      not others, plus retiring a lens whose mapping has collapsed to identity. Long-term.
- [ ] **`Lens.generate(source, target)`** — propose a draft mapping from two declared schemas, with
      unresolvable value semantics reported as typed holes rather than guessed.
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
