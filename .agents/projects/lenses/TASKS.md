# ECHO Lenses — Tasks

_Resume: PHASES 1-4 DONE for BOTH lenses. `useLens` ships on `@dxos/echo-panproto/react`; `@dxos/stories-lens` has 6 passing stories across two demos (`Default` renders only; `DefaultTest` and `Collaboration` carry assertions): Task→GtdTask, and Text→rich text with the core markdown editor on one side and a basic ProseMirror editor on the other. The rich-text lens is a coded lens using `@lezer/markdown` source offsets **and inline marks**, with 11 unit tests; the ProseMirror editor renders real `<strong>`/`<em>`/`<code>` and toggles them with Mod-b/i/e. Remaining: nothing from the original plan — see Phase 5/6 backlog. NOTE for a fresh session: this container's Playwright is revision 1194 but the repo pins 1200, so `stories-lens:test-storybook` needs a local shim (symlink `/opt/pw-browsers/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell` → the 1194 `headless_shell`) and `plugin-sketch:build` for the shared storybook static dir. Neither is a repo change. Uncommitted: none. Previously: Phase 1 CORE + DATABASE VERIFICATION DONE. `@dxos/echo-panproto` ships the `Lens` namespace (30 unit tests) and `@dxos/echo-client-e2e/src/lens.test.ts` proves it against a real automerge-backed `Task` including **two peers editing one object concurrently — one through the canonical type, one through the lens — with both edits surviving** (4 tests; the package's full 294 stay green). Uncommitted: none._

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
- [x] **Law-check spike** — resolved by implementing it directly: `Lens.checkLaws` checks GetPut
      host-side over the object's own values, needing no engine call and no mutation. It immediately
      caught two real defects (a `get` that defaulted `undefined`→`'todo'` while `put` wrote it back,
      and a mislabelled violation), which is the argument for having it. PutGet is not implemented —
      it needs a clone or sample generator; recorded in API.md §9.
- [x] **Mapping resolution** — implemented via `SchemaEx.getProperties`. Compatibility is
      deliberately conservative: an optional source cannot feed a required target, enum-like
      properties must carry the _same_ literal set, structs must declare the same property names,
      and declarations compare by AST identifier. Everything else is `suspicious`, never auto-mapped
      and never auto-overlaid.
- [x] **Hand-author the Task→GtdTask mapping** — done against local `Task`/`GtdTask` types in
      `Lens.test.ts`, including the lossy `status` split, both value conversions, a read-only
      projection, and two overlay properties. Go for the declarative path.
  - **Correction to the plan:** the shipped example lens cannot live in `@dxos/echo-panproto` —
    `core/echo` must not depend on `sdk/types` (only test-only `echo-client-e2e` does). It belongs
    with the types it binds, in the consumer package.
  - Generator-driven instances (`createProps`) also live behind `@dxos/schema`, so the law check
    currently samples the object's own values; property-based sampling moves to the consumer too.
- [x] **Source-offset spike** (DESIGN.md §5.B) — superseded by shipping it: the offsets come from
      `@lezer/markdown`, already a catalog dependency via `@dxos/react-ui-markdown`, rather than from
      mdast/remark (which would have needed new catalog entries for nothing). Confirmed by
      `rich-text.test.ts`: ranges quote their source, a one-block edit is one splice, and an unedited
      tree round-trips byte-identically.
- [x] **Decision: where the engine runs for the object lens.** Nowhere, as it turns out. Mapping
      resolution, projection, inversion, overlay storage, and the law check are all plain TypeScript
      over `SchemaEx`/`Obj`, so the object lens has **no** dependency on the wasm engine — it shares
      the package with the wire lens (which does use it) but never loads it.

## Phase 1: Core — the first-class surface

No UI. Tests are the consumer. Shaped as a namespace module from day one so promotion into
`@dxos/echo` is a move, not a redesign (DESIGN.md §2.1).

### Tasks

- [x] **Extend `@dxos/echo-panproto` with a `Lens` namespace export** — new modules beside the
      existing `Panproto` wire lens (DESIGN.md §9); built against `@dxos/echo` and
      `@dxos/echo/internal`. The existing `Panproto`/`runner`/`wasm` surface stays untouched.
      React bindings sit on a `./react` subpath of the same package. — `src/Lens.ts` + `src/lens/*`; the wire lens schema moved to `wire-lens.ts` so the public namespace name matches its filename (repo lint rule) without touching the `Panproto` surface.
- [x] **`Lens.make(id, Source, Target, mapping)`** (API.md §1) — the single authoring shape; both
      ends are declared types. Static (code) and persisted (space) definition paths, mirroring
      `Type` / `Type.Type`. An ordinary ECHO object, **not** a new `EntityKind` (API.md §0). — plus `Lens.coded` for opaque transforms.
- [x] **Mapping resolution + shorthands** (API.md §2) — automatic identity mapping for matching
      name/type; bare-string rename; `Lens.from(prop, codec)`; `Lens.readOnly(prop)`; full
      `Derived` form. Keep the vocabulary small and add convenience only where a real mapping is
      verbose. — bare-string rename, `Lens.from(prop, codec)`, `Lens.readOnly(prop)`, full `Derived`, and `Lens.scale`/`Lens.lookup` codecs.
- [x] **The target type IS the view type** — `Lens.make` returns `Lens<InstanceType<S>, TargetOf<T>>`,
      so no type-level mapping machinery exists at all; a persisted lens rehydrated against a static
      target yields that static type (DESIGN.md §3 D2). Exercised by the persistence test.
- [x] **`Write` vocabulary** (API.md §6) — `assign` | `splice` | `overlay`, with no whole-object
      replace expressible. This is where write-minimality becomes a type error rather than a rule. — `assign` | `splice` | `overlay`, no `replace`; `applyWrites` lands them as one change.
- [x] **Overlay by default** — target properties nothing maps store themselves in the annotation
      dictionary, validated against the target's declaration for that property. No declaration
      required, `store` default, `reject` opt-in. — keyed lens id → property in the entity annotation dictionary; writing `undefined` clears.
- [x] **`Lens.coverage`** (API.md §2.1) — explicit / automatic / overlaid / dropped, plus
      `suspicious`: a name match with incompatible types, or an overlay resembling a source
      property. Never auto-resolve that case — it records the same fact twice and the copies drift. — explicit / automatic / overlaid / dropped / suspicious, asserted in tests.
- [x] **Target typename identity** — `Obj.getTypename` on a lensed object returns the _target's_
      typename so existing surfaces resolve, while `Obj.getURI` still resolves to the base object
      (API.md §4.1). Plus `Lens.sourcesFor(Target)` reverse lookup. — the handle intercepts `SchemaId`/`TypeId`/`TypeEntityId` so `Obj.getTypename` reports the target while `Obj.getURI` still resolves to the base object.
- [x] **`put` totality audit** — an interface written for the target will write anything the target
      schema permits; every property needs a real inverse, an overlay, or `Lens.readOnly` that the
      form renders as visibly non-editable. A silently dropped write is the worst outcome. — a read-only property throws instead of dropping the write; an unmapped property throws.
- [x] **T1 snapshot codec** — `get(obj)` / `put(view, obj)` in one `Obj.update`. — `Lens.get` / `Lens.put`, the latter taking a partial view.
- [x] **T2 live proxy over public internals** — build it from `@dxos/echo/internal` (already a
      declared subpath used by ~20 packages outside core). If it turns out to need a change inside
      `Obj`'s proxy handler, that becomes its own small core PR — the one thing that could force
      core work early (DESIGN.md §2.1). — built from `@dxos/echo/internal`; **no core change was needed**. Intercepting `ChangeId` makes `Obj.update(lensed, cb)` batch every assignment into one change against the base object.
- [x] **T2 minimal-write** — diff the view, map changed paths back through the compiled table,
      assign only those (DESIGN.md §6.4). Non-pointwise mappings fall back to T1 and are barred
      from collaborative surfaces. — writes name only what changed, asserted directly.
- [x] **Overlay storage** — `LensOverlay` annotation keyed lens DXN → property.
- [x] **`Lens.checkLaws` harness (D4)** — property-based, instances from `GeneratorAnnotation`, run in
      both directions; the reverse pass is what surfaces `put`-totality gaps. — GetPut only; see API.md §9.
- [x] **Registry** — resolve static and space-stored lenses by source typename.

## Phase 2: Task → GTD lens

### Tasks — `register`/`resolve`/`lensesFor`/`sourcesFor`.

- [ ] **`GtdTask` ECHO type**, written out — the target the lensed UI is built against.
- [ ] **`lenses/task-gtd.ts`** per the mapping table in DESIGN.md §5.A (status split, priority
      convert, estimate unit convert; `title`/`description` automatic; `context`/`waitingOn`
      overlay).
- [ ] **Unit tests** — round-trip, laws, overlay persistence, and an explicit test that a lensed
      write touches _only_ the changed properties.
- [ ] **Lensed UI** — a `Form` rendered from `GtdTask`, importing no `DataType.Task`.
- [ ] **Reactive read path** — composed `Obj.atom` + `Annotation.atom`, no over-firing.

## Phase 3: Text → rich text lens — DONE

A _coded_ lens (parsing is not a per-property mapping), on `Text` rather than a document type so it is
reusable for every text-bearing type. Lives in `@dxos/stories-lens` for now, since it owns the parser
dependency — the same reason the GTD lens lives there.

### Tasks

- [x] **`get`** — `Text.content` → blocks, each carrying its exact `[start, end)` source range.
      **Parser: `@lezer/markdown`, not remark** — it was already a catalog dependency (via
      `@dxos/react-ui-markdown`) and its nodes carry `from`/`to` offsets, which is precisely the anchor
      the lens needs. Adding `remark-parse` would have bought nothing.
- [x] **`put`** — diff the block trees and splice each changed block over its own range; walk backwards
      so every splice is expressed in the coordinates the blocks were parsed with. Never rewrites
      `content`.
- [x] **Inline marks in the block model** — blocks carry `content: Inline[]` (runs with
      `em`/`strong`/`code`), parsed from the mark nodes lezer already identifies, with the delimiters
      dropped: the `**` belongs to the stored string, not to the view. Round-trips to the same
      delimiters.
- [x] **Basic ProseMirror editor** over the block tree (`RichTextEditor.tsx`) — schema with the three
      block kinds **and the three marks**, so it renders real rich text (`<strong>`/`<em>`/`<code>`) and
      toggles marks with Mod-b/i/e. Reconciles incoming changes only when unfocused, so a remote edit
      never fights the local caret. New catalog entries:
      `prosemirror-{model,state,view,keymap,commands}`.
- [x] **The actual markdown editor** on the same object (`MarkdownEditor.tsx`) — the same extension set
      Composer's `MarkdownEditorContent` uses (`createBasicExtensions` + `createThemeExtensions` with
      `syntaxHighlighting` + **`createMarkdownExtensions`**) over
      `Doc.createAccessor(text, ['content'])`, unaware any lens exists.
- [x] **Unit tests (9)** — ranges quote their source, one block edit produces exactly one splice, two
      independent edits splice independently, append/remove touch only their own span, and an unedited
      tree round-trips **byte-identically**.

### Known limits of the demo lens

- Blocks carry plain text: no inline marks (bold/italic), so the ProseMirror editor is structural only.
- Blocks are matched by position, so a reorder rewrites the affected span rather than moving it.
- Block identity is per-parse, so ranges shift under a concurrent peer's edit to an _earlier_ block.
  The durable fix is Automerge cursors (Phase 6), which is also what comment anchors would need.

## Phase 3b: Database verification — DONE

The claim that made write-minimality load-bearing, checked headlessly in CI rather than only visually.
`packages/core/echo/echo-client-e2e/src/lens.test.ts` (that package already depends on `@dxos/types`,
so the real `Task` is available, and it has the replication harness).

### Tasks

- [x] **Live handle over an automerge-backed object** — reads, `Obj.update` writes, target-typename
      identity, and the overlay landing in the object's annotations rather than as a stray property.
- [x] **The overlay survives a reload** — `peer.reload()` + reopen; it is part of the object, so it
      persists with it.
- [x] **A lensed write names only what it changes** — asserted on the write set directly.
- [x] **Two peers, one object, concurrent edits.** Peer 1 renames `title` through the canonical
      `Task`; peer 2 completes it through the lens (`done = true`) and sets an overlay. Both survive
      on both peers, the overlay replicates, and a later canonical-side `status` change shows through
      the lens on the other peer. **This is the test that fails if a lens write is not minimal.**

## Phase 4: Stories

`packages/stories/stories-lens`. The collaboration claim is proven headlessly in Phase 3b, so these are
the _visual_ deliverable — a human seeing two interfaces drive one object — with `play` functions so CI
keeps them honest.

### Tasks

- [x] **`useLens` on `@dxos/echo-panproto/react`** — mirroring `useObject`'s tuple and overload shape,
      including the property overload that subscribes only through a mapping's `from`. Reactivity comes
      from the base object's own atom; a lens holds no state. Deliberately in this package rather than
      `@dxos/echo-react` — the whole lens surface stays together until the API is internalized — on a
      separate subpath so the main entry stays React-free for worker contexts.
- [x] **`GtdTask` + the `Task`→`GtdTask` lens** in the stories package (not in `echo-panproto`, per the
      layering correction in Phase 0).
- [x] **Shared raw-inspector component** — live base-object JSON + the lens overlay from
      `meta.annotations`. The proof-of-persistence pane.
- [x] **Story: `SideBySide`** — canonical panel | lensed panel | raw inspector, one peer. Asserts the
      lensed `done` toggle writing `status`, the reverse direction, and an overlay landing in
      annotations and **not** as a property of the base object.
- [x] **Story: `Collaboration`** — `withMultiClientProvider({ numClients: 2 })`, canonical UI on peer 0
      and lensed UI on peer 1 over a real invitation. Asserts the lensed completion reaching the
      canonical form on the other peer, the overlay replicating, a canonical rename reaching the lensed
      title, and — the point — that rename **not** reverting the earlier lensed edit.
- [x] Both stories pass in the browser runner; package build and lint clean.
- [x] **Story: `RichTextLens/Default`** — markdown editor | ProseMirror editor | block list with ranges,
      one peer. Asserts the view carries no `#`/`**` but does render `<strong>`/`<em>`/`<code>`, and that
      a block edit leaves every other line verbatim.
- [x] **Story: `RichTextLens/Collaboration`** — markdown editor on peer 0, ProseMirror on peer 1. A
      block edit on one peer reaches the other's markdown editor and the rest of the document survives.
- [x] **Story shape** — `Default` is the side-by-side story and renders only, for a human to poke at;
      `DefaultTest` carries its assertions; `Collaboration` carries its own inline (no separate twin).
      Titles are `stories/stories-lens/*`, matching the sibling packages.
- [x] **Rich text renders as rich text, not as elements that happen to exist.** The first version of
      the assertions passed while headings, `strong`, and bullets all rendered as undifferentiated
      text: the theme's preflight resets heading sizes, bold weight, and list markers, and a bare
      `<li>` outside a `<ul>` has no marker at all. Fixed by giving the ProseMirror schema real
      `bullet_list`/`list_item` nodes (consecutive bullets grouped on the way in, ungrouped on the way
      out, since the lens addresses one markdown line per block) plus a `CONTENT_CLASSES` block on the
      editor, and by asserting **computed style** — `fontSize` vs the paragraph, `fontWeight`,
      `fontStyle`, `display: list-item`, `listStyleType: disc`.
- [x] **Both directions stay in sync as either side is edited.** `DefaultTest` now drives Direction 1
      (edit the lensed block tree → assert the *stored string*, with every untouched line verbatim) and
      Direction 2 (edit the markdown source → assert the block list and the lensed editor follow, the
      list structure survives, and the Direction-1 edit is still there). `Collaboration` does the same
      across two peers. The markdown pane is deliberately the source view — no `decorateMarkdown`.

### Notes for whoever runs these

- The story timeout is raised to 60s in `vite.config.ts`: two clients, two identities, and an
  invitation all happen before the first assertion, well past the 15s default.
- Drive controlled inputs with `userEvent`, never a raw `.value` assignment — React tracks its own
  value and never fires `onChange` for the latter. (Selects respond to a plain `change` event, which
  is why they appear to work; text inputs do not.)
- `userEvent.keyboard('{End}')` goes through `setSelectionRange`, which contenteditable does not
  implement — it throws in a ProseMirror editor. Click, then type; assert on what the edit did to the
  _other_ blocks rather than on an exact caret position.
- Don't hardcode source offsets in assertions; derive them from the fixture. The offsets are the
  claim, so a wrong constant reads as a lens bug.
- **A lens must not be cached behind a change signal.** `useLensValue` originally memoized the
  projection against a derived `Obj.atom`; that atom does not invalidate for string-CRDT splices, so a
  lens over `Text` served a view the object had already moved past. It now subscribes for the
  _schedule_ and projects on every render — the projection is pure and cheap, and correctness beats the
  saved call. Anything else that caches a lens view owes the same reasoning.
- **The editor that holds its own document needs three things** to reconcile without fighting the
  caret: an effect keyed on a *value* signature (`signatureOf`) rather than object identity, a
  `REMOTE`-marked transaction so `dispatchTransaction` doesn't write an incoming change straight back
  out, and a `blur` handler to apply whatever was skipped while it had focus.
- Don't assert which block a caret landed in after typing into the other editor. Diagnostics chased a
  "stale signature" that was changing correctly on every keystroke — the real problem was the
  assertion pinning the typed text to the `<ul>`. Assert that the text arrived and that the structure
  survived.

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
