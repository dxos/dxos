# ECHO Lenses — Tasks

_Resume: Phase 0 — evaluate `@panproto/core` (WASM) in node/browser/workerd and hand-author the Task→GTD lens to law-check it; that result picks the architecture. Uncommitted: none. Last: DESIGN.md authored (planning only, no code, no PR)._

Design and rationale live in [DESIGN.md](./DESIGN.md). This file is the ledger only.

## Phase 0: Spike — can panproto live in our runtime?

Everything downstream depends on the answer, and it is a day's work. Nothing else starts first.

### Tasks

- [ ] **Load `@panproto/core` in each target**
  - node (test runner), browser (vite bundle), and `workerd` — ECHO runs in a shared worker, so
    a WASM module that can't load there changes the architecture.
  - Record bundle size and cold-start cost in DESIGN.md §6.1.
- [ ] **Verify the TS SDK surface** listed in DESIGN.md §2 against the real package
      (`Panproto.init`, `MigrationBuilder`, `LensHandle.get/put/checkLaws`, `GetResult { view,
complement }`, `composeLenses`). Correct the design doc where the book and the package differ.
- [ ] **JSON Schema round-trip** — `JsonSchema.toJsonSchema(DataType.Task)` → panproto → back;
      confirm our ECHO-specific annotations (`PropertyMetaAnnotationId`, `FormatAnnotation`, refs)
      survive or are cleanly ignored.
- [ ] **Hand-author lens A** (Task → GTD, DESIGN.md §5.A) as a spec file; run `checkLaws` on
      generated instances. This is the go/no-go signal.
- [ ] **Spike the markdown complement question** (DESIGN.md §5.D) — can a complement carry
      per-node markdown formatting choices well enough to round-trip a real document byte-identically?
      Throwaway node script, no ECHO involvement.
- [ ] **Decision: engine-in-runtime vs author-time-only.** Write it up in DESIGN.md §6.1 with the
      measured numbers, then delete the losing branch from the design.

## Phase 1: Core — lens type, codec, overlay

Snapshot-tier (T1) lensing over ECHO objects, with the overlay stored in the annotation
dictionary. No UI, no reactivity — tests are the consumer.

### Tasks

- [ ] **Scaffold `packages/sdk/lens` (`@dxos/lens`, `"private": true`)** with deps as
      workspace/catalog per repo rules.
- [ ] **`Lens` ECHO type** (`org.dxos.type.lens`) per DESIGN.md §3.1, plus the code-defined
      registration path.
- [ ] **T1 codec** — `get(obj)` / `put(view, obj)` inside a single `Obj.update`.
- [ ] **Overlay storage** — `LensOverlay` annotation, keyed lens DXN → property; per-property
      validation against the lens target; `overlayPolicy` (`reject` | `store`).
- [ ] **Lens registry** — resolve built-in and space-stored lenses by source typename.
- [ ] **Example A end-to-end** (Task → GTD) with law-check assertions.
- [ ] **Example B** (Organization → schema.org, DESIGN.md §5.B) — attempt `lens generate` rather
      than hand-authoring; record whether generation was usable.

## Phase 2: Live proxy and UI

### Tasks

- [ ] **Compile a structural lens to a path table**; reject non-pointwise specs (fall back to T1).
- [ ] **T2 reactive proxy** — reads/writes map through the table; `Obj.atom` still fires; overlay
      reactivity via `Annotation.atom`/`atomProperty`.
- [ ] **`useLens` hook** + render a lensed `Form`.
- [ ] **Table/Kanban through a lens** via `View.Projection.schema` override.
- [ ] Storybook story showing one object rendered under two lenses side by side.

## Phase 3: Agent surface

The cheapest place for lenses to pay off — no UI required.

### Tasks

- [ ] **Lensed object serialization for tools** — an agent sees the lens target, not the base type.
- [ ] **Writes validated through `put`** against the base type before they land.
- [ ] **Lens selection** — operation/skill so an assistant can pick the lens for a task.
- [ ] Eval or deterministic operation test showing a narrowed lens reduces tool surface without
      losing capability.

## Phase 4: Markdown → rich text

Gated on the Phase 0 complement spike.

### Tasks

- [ ] **`get`: markdown → mdast → normalized block tree** (remark/remark-gfm, already in catalog).
- [ ] **`put`: blocks → markdown → `Text.update`** so the write is a minimal Automerge diff.
- [ ] **Complement carries formatting choices** so untouched regions round-trip byte-identically.
- [ ] **Anchor/comment survival test** — edit a block, assert existing comment anchors and cursors
      still resolve.
- [ ] **Agent block operations** — insert/replace/retitle a section by block address.

## Phase 5: Backlog

- [ ] External-protocol lenses (Linear / GitHub / ATProto lexicon) replacing hand-written
      connector mappers (DESIGN.md §5.C).
- [ ] Overlay **promotion** — migrate an overlay property into the base type via panproto's
      migration layer (DESIGN.md §6.6).
- [ ] Querying _through_ a structural lens (rewrite `Filter` on lensed property names).
- [ ] Read-only lens as a redaction/capability boundary (DESIGN.md §6.3).
- [ ] Lens versioning policy when the base type migrates (DESIGN.md §6.4).

## References

- [DESIGN.md](./DESIGN.md) — model, tiers, overlay rules, examples, risks.
- panproto: https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  toolkit https://github.com/panproto/panproto-toolkit
