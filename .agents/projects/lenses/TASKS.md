# ECHO Lenses — Tasks

_Resume: Phase 0 — spike `@panproto/core` (WASM) loadability + the Task→GTD lens law-check, and confirm mdast source offsets survive a real markdown round-trip. Those two answers pick the architecture. Uncommitted: none. Last: DESIGN.md rewritten around the two lenses (Task, Text→rich text) and the four stories._

Design and rationale live in [DESIGN.md](./DESIGN.md). This file is the ledger only.

**The bar for "done" on both lenses:** a custom UI drives the object entirely through the lens
schema, all data persists in the base object under its own schema plus annotations, and a second
peer on the canonical UI collaborates with it live, in both directions.

## Phase 0: Spikes

Two independent questions, both cheap, both architecture-deciding. Nothing else starts first.

### Tasks

- [ ] **Load `@panproto/core` in each target** — node (test runner), browser (vite), and
      `workerd`. ECHO runs in a shared worker; a WASM module that can't load there changes the
      architecture. Record size and cold-start in DESIGN.md §6.1.
- [ ] **Verify the TS SDK surface** listed in DESIGN.md §2 against the real package. Correct the
      design doc wherever the book and the package differ.
- [ ] **JSON Schema round-trip** — `JsonSchema.toJsonSchema(DataType.Task)` → panproto → back.
      Confirm ECHO-specific annotations (`PropertyMetaAnnotationId`, `FormatAnnotation`, refs)
      survive or are cleanly ignored.
- [ ] **Hand-author the Task→GTD lens** as a spec; run `checkLaws` on generated instances,
      including the lossy `status` split. Go/no-go for the declarative path.
- [ ] **mdast offset spike** (DESIGN.md §4.B) — parse a real document, confirm every block node
      carries usable `position.*.offset`, edit one block, splice it back, and assert the rest of
      the source is byte-identical. Throwaway node script, no ECHO.
- [ ] **Decision: engine-in-runtime vs author-time-only.** Write it into DESIGN.md §6.1 with the
      measured numbers, then delete the losing branch from the design.

## Phase 1: Core — lens interface, overlay, minimal writes

No UI. Tests are the consumer. Both write tiers land here because the stories need T2.

### Tasks

- [ ] **Scaffold `packages/sdk/lens` (`@dxos/lens`, `"private": true`)**; in-repo deps
      `workspace:*`, external via catalog.
- [ ] **`Lens` interface + `org.dxos.type.lens` ECHO type** (DESIGN.md §3.1), with both
      registration paths (code-defined, ECHO-stored).
- [ ] **T1 snapshot codec** — `get(obj)` / `put(view, obj)` in a single `Obj.update`.
- [ ] **T2 minimal-write** — diff the view, map changed paths back through the compiled table,
      assign only those (DESIGN.md §3.5). Non-pointwise specs fall back to T1 and are barred from
      collaborative surfaces.
- [ ] **Overlay storage** — `LensOverlay` annotation keyed lens DXN → property; validate each
      value against the lens target; `overlayPolicy` (`reject` default | `store`).
- [ ] **Law-check harness** usable by both declarative and coded lenses.
- [ ] **Registry** — resolve built-in and space-stored lenses by source typename.

## Phase 2: Task → GTD lens

### Tasks

- [ ] **`lenses/task-gtd.ts`** per the mapping table in DESIGN.md §4.A (status split, priority
      convert, estimate unit convert, `context`/`waitingOn` overlay).
- [ ] **Unit tests** — round-trip, law checks, overlay persistence, and an explicit test that a
      lensed write touches _only_ the changed properties.
- [ ] **Lensed UI** — a `Form` rendered from the lens target schema, importing no `DataType.Task`.
- [ ] **Reactive read path** — composed `Obj.atom` + `Annotation.atom` view, no over-firing.

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
      WYSIWYG; scope guard in DESIGN.md §4.B.
- [ ] **Tests** — round-trip fidelity on a document exercising both bullet styles, both heading
      styles, and reference links; plus a byte-identical assertion after a single-block edit.

## Phase 4: Stories

The deliverable. `packages/stories/stories-lens`. Four stories, all with `play` functions so CI
enforces them (DESIGN.md §5).

### Tasks

- [ ] **Shared raw-inspector component** — live base-object JSON + `Obj.getMeta(obj).annotations`.
      This is the proof-of-persistence pane; both single-peer stories use it.
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

## Phase 5: Backlog

- [ ] Stable block identity via Automerge cursors (the anchoring `@dxos/react-ui-editor` already
      uses for comments), replacing per-parse ephemeral block ids (DESIGN.md §4.B).
- [ ] Agent surface — lensed serialization for tools, writes validated through `put`.
- [ ] External-protocol lenses (Linear / GitHub / ATProto lexicon) replacing hand-written
      connector mappers.
- [ ] Overlay **promotion** — migrate an overlay property into the base type.
- [ ] Querying _through_ a structural lens (rewrite `Filter` on lensed property names).
- [ ] Read-only lens as a redaction/capability boundary.
- [ ] Lens versioning policy when the base type migrates (DESIGN.md §6.6).
- [ ] Dropped from scope: Organization → schema.org lens.

## References

- [DESIGN.md](./DESIGN.md) — model, tiers, concurrency rule, the two lenses, the four stories.
- panproto: https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  toolkit https://github.com/panproto/panproto-toolkit
