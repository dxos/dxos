# ECHO Lenses — Tasks

_Resume: PHASES 1-4 DONE for BOTH lenses. `useLens` ships on `@dxos/echo-panproto/react`; `@dxos/stories-lens` has 6 passing stories across two demos (`Default` and `Collaboration` render only; `Spec` carries the assertions): Task→GtdTask, and Text→rich text with the core markdown editor on one side and a basic ProseMirror editor on the other. The rich-text lens is a coded lens using `@lezer/markdown` source offsets **and inline marks**, with 11 unit tests; the ProseMirror editor renders real `<strong>`/`<em>`/`<code>` and toggles them with Mod-b/i/e. Both story specs assert **bidirectional** sync at the exact line each edit produced (see the `userEvent.click`/CodeMirror caret note), and are mutation-checked. The UI is `@dxos/react-ui` primitives throughout — both task panels are the same `Form` given a different schema — except the ProseMirror editor. Remaining: nothing from the original plan — see Phase 5/6 backlog. NOTE for a fresh session: this container's Playwright is revision 1194 but the repo pins 1200, so `stories-lens:test-storybook` needs a local shim (symlink `/opt/pw-browsers/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell` → the 1194 `headless_shell`) and `plugin-sketch:build` for the shared storybook static dir. Neither is a repo change. Uncommitted: none. Previously: Phase 1 CORE + DATABASE VERIFICATION DONE. `@dxos/echo-panproto` ships the `Lens` namespace (30 unit tests) and `@dxos/echo-client-e2e/src/lens.test.ts` proves it against a real automerge-backed `Task` including **two peers editing one object concurrently — one through the canonical type, one through the lens — with both edits surviving** (4 tests; the package's full 294 stay green). Uncommitted: none._

Design and rationale live in [DESIGN.md](./DESIGN.md); proposed signatures in [API.md](../../../packages/core/echo/echo-panproto/API.md).
This file is the ledger only.

**Scope: proof of concept.** The payoff being chased is _multiple interfaces, each written against
its own schema, driving the same object_. Migration and lens generation are long-term and not built
here — both now have plans of their own below ("Migration — phased plan", "`Lens.generate` — decision
note").

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
      (edit the lensed block tree → assert the _stored string_, with every untouched line verbatim) and
      Direction 2 (edit the markdown source → assert the block list and the lensed editor follow, the
      list structure survives, and the Direction-1 edit is still there). `Collaboration` does the same
      across two peers. The markdown pane is deliberately the source view — no `decorateMarkdown`.
- [x] **Every edit is asserted at the position it landed, not merely somewhere in the document.** Each
      direction pins the exact resulting line (`# One object, two editorsEDIT`,
      `- So an edit splices that range aloneSYNC`, `items[1].textContent`), because a bare
      `toContain('SYNC')` passed while the edit had gone into a completely different block (the caret
      note below). Mutation-checked: dropping the reconcile effect's signature dependency fails both
      story tests exactly at the sync assertion, so the assertions are load-bearing rather than
      incidentally true.

- [x] **The UI is built from `@dxos/react-ui` primitives, not hand-rolled markup.** Both task panels
      are the _same_ component — `Form` from `@dxos/react-ui-form` — given a different schema, which
      states the lens's claim as code: a surface written against a type drives any object that lenses
      to it. Panel chrome is `Panel.Root`/`Toolbar`/`Content` + `ScrollArea`; the inspector is
      `Card.Section` + the `Syntax.*` composition; the loading state is `Loading`. The one exception
      is the ProseMirror editor, since there is no `react-ui` rich-text editor.
- [x] **Story shape (revised)** — `Default` renders only; `Spec` (formerly `DefaultTest`) carries the
      assertions; `Collaboration` renders only and smoke-tests the two-peer mount.

### Notes for whoever runs these

- **`Form`'s `autoSave` fires on blur only, and the switch and select fields never blur** — a toggled
  `done` or a chosen `status` would never reach the object. Drive object writes from
  `onValuesChanged` (guarded on `meta.isValid`) instead; it fires per change for every field type and
  reports exactly the one path that changed, which is also precisely the minimal patch the lens wants.
- **Addressing `Form` fields from a play function**: there are no per-field test ids, so `testing.ts`
  walks out from the label to the field's control. Note the asymmetry — a select's _trigger_ shows the
  schema value (`in-progress`) while its _options_ show labels; here both are the raw value, so
  `selectOption` takes the value. Options render in a portal on `document.body`, not in the canvas.
- **Weight and slant come from `font-variation-settings`, not `font-weight`/`font-style`.** The theme
  sets `font-synthesis: none` and pins `'wght' 400, 'slnt' 0` at `:root`, and only the theme's literal
  `.font-bold` / `.italic` / `.font-semibold` classes move those axes. A descendant variant
  (`[&_strong]:font-bold`) emits an inert `font-weight: 700`, so bold shipped rendering as regular
  while a `getComputedStyle(...).fontWeight` assertion passed. Put the theme's class on the element —
  for ProseMirror that means the mark/node `toDOM` — and assert `fontVariationSettings`.
- The story timeout is raised to 60s in `vite.config.ts`: two clients, two identities, and an
  invitation all happen before the first assertion, well past the 15s default.
- Drive controlled inputs with `userEvent`, never a raw `.value` assignment — React tracks its own
  value and never fires `onChange` for the latter. (Selects respond to a plain `change` event, which
  is why they appear to work; text inputs do not.)
- `userEvent.keyboard('{End}')` goes through `setSelectionRange`, which contenteditable does not
  implement — it throws in a ProseMirror editor. Click, then type.
- **`userEvent.click` places the caret at document position 0 in CodeMirror.** It reports no pointer
  coordinates (`clientX`/`clientY` default to 0), and CodeMirror derives the caret from them — so
  clicking a specific `.cm-line` still types at the top of the document. This cost a long debugging
  detour: text typed "into a bullet" landed in front of the `#`, which also silently demoted the
  heading to a paragraph. Use `userEvent.pointer` with coordinates from the line's bounding rect
  (`typeAtEndOfLine` in `RichTextLens.stories.tsx`); clicking past the right edge of a line maps to its
  end. The lesson generalizes: **assert the exact line an edit produced**, never just that the typed
  text appears somewhere — a document-wide `toContain` cannot tell a working caret from a broken one.
- Don't hardcode source offsets in assertions; derive them from the fixture. The offsets are the
  claim, so a wrong constant reads as a lens bug.
- **A lens must not be cached behind a change signal.** `useLensValue` originally memoized the
  projection against a derived `Obj.atom`; that atom does not invalidate for string-CRDT splices, so a
  lens over `Text` served a view the object had already moved past. It now subscribes for the
  _schedule_ and projects on every render — the projection is pure and cheap, and correctness beats the
  saved call. Anything else that caches a lens view owes the same reasoning.
- **The editor that holds its own document needs three things** to reconcile without fighting the
  caret: an effect keyed on a _value_ signature (`signatureOf`) rather than object identity, a
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
- [ ] **Migration** — phased plan below (["Migration — phased plan"](#migration--phased-plan)):
      M0 proof of concept, M1 lens-backed single-object, M2 lossless + cross-object + fan-out.
      Rationale and the losslessness bar in DESIGN.md §10. Not scheduled; M1 is gated on the lens
      landing in core.
- [ ] **`Lens.generate(source, target)`** — see [the decision note](#lensgenerate--decision-note)
      below. **Recommendation: don't take it on yet**; do "Richer source annotations" (Phase 5) first.
- [ ] **Cross-object lenses — composition** (DESIGN.md §11.2-11.4). Lens the _referenced object too_:
      `Task.assignee: Ref<Person>` becomes `GtdTask.assignee: Ref<GtdPerson>`, dereferencing yields a
      lensed `Person`. One lens per node, still one object per node. **Easier than projection and
      worth more** — it introduces no partiality of its own, writes stay inside each object, identity
      survives (`Lens.of` proxies the base), and `sourcesFor` already resolves which lens produces the
      declared ref type. The payoff is the whole surface stack over a foreign _graph_, not one form.
      First real work is an `of` cache keyed by (object, lens id) — the current proxy is minted per
      call, so `===` and React memoization break without it. Then: `compatible()` grading
      `Ref(Person)` → `Ref(GtdPerson)` as `automatic` when a registered lens connects them; and
      validation, since the target schema declares a ref to a type no stored object has.
- [ ] **Cross-object lenses — projection** (DESIGN.md §11.5). Flatten a referenced object's fields
      (`assigneeName`). The harder half: `get` must stay sync and pure, so a projected property is
      partial (`undefined` until loaded); writes across the hop are non-atomic until Automerge has
      cross-object transactions; collections stay read-only. One carve-out — traversal along a
      **strong dep** (relation source/target, parent) is total and synchronous today, because those
      load before the entity surfaces. Needs §10.5's write-set-with-an-address, which composition
      does not.
- [ ] Querying _through_ a structural lens (rewrite `Filter` on lensed property names).
- [ ] Read-only lens as a redaction/capability boundary.
- [ ] Lens versioning when the base type migrates — including whether the target re-derives
      automatically (DESIGN.md §8.7).
- [ ] Dropped from scope: Organization → schema.org lens.

## Migration — phased plan

Not scheduled. Rationale and the survey of what exists today: DESIGN.md §10 — read that first, this
is the ledger.

**The bar (DESIGN.md §10.1): no unconflicted change may be lost, regardless of when it was made.**
The case that defines it — a peer is offline when the migration runs, keeps editing under the old
schema for a week, and comes back. Those edits conflict with nothing. They must reach the new schema.
Only a genuine conflict (two peers writing incompatible values for the same field) may lose a side.

Each phase is measured against that bar, and each says honestly where it does not meet it yet.

### Phase M0 — research: can late old-schema changes be folded forward?

Standalone, no API changes, no integration — and **the only phase startable today** (M1 gates on
Phase 5; M2 gates on this). This is **the research phase** — M2 "integrates the research", and this
is the research it integrates. Each claim is roughly one spike, they share one harness, and the
deliverable is answers plus the §10.3 writeup that fixes M2's shape — no shippable code. Not
labelled "a spike": a spike is one time-boxed question with one go/no-go, and this has twelve
independent kill-points in two tracks with different costs. **Track A — fold-forward
core** (claims 1-5, 12) needs only the harness below; run it first, in kill order **1, 2, 12, 5**,
then 3-4 — claim 12 jumps ahead of the cheap ones because it is the likeliest bar-breaker, and
claim 5's answer is already known to require app-level machinery (see its text). **Track B — entity
lifecycle** (claims 6-11) needs scaffolding (an identity-key helper, a fan-out runner sketch — and claim 6's venue is
largely object-merging's own Phase 0 spike, adopted rather than duplicated) and can
overlap M1. Claim numbers are referenced from M1/M2 — grouped, not renumbered. DESIGN.md §10.3 has
the mechanism.

- [ ] **Harness** — two peers, one object, a lens migration `A → B`. Peer 1 migrates while peer 2 is
      partitioned; peer 2 writes the old shape; reconnect. Extends the existing two-peer setup in
      `echo-client-e2e/src/lens.test.ts`.
- [ ] **Claim 1 · does the late write survive the merge at all?** If the migration deletes old
      properties, does a later write to a deleted key survive, or does the delete win? **If deletes
      win, migrations must not delete** — old properties stay until a separate compaction. Answer this
      first; it constrains everything downstream.
- [ ] **Claim 2 · can late writes be told apart from consumed ones?** Store the migration's automerge
      heads in `EntityMeta`; `A.diff(doc, migrationHeads, current)` restricted to source-schema
      properties should name exactly the late writes. `A.getHeads`/`A.diff` are already used in
      `echo-client/src/echo-handler/edit-history.ts`. **Test it across an epoch/compaction** — history
      rewriting is the likeliest way this breaks.
- [ ] **Claim 3 · does folding forward converge?** Two peers both notice the same late write and both
      fold it. Deterministic minimal writes should produce identical changes; prove it rather than
      assume it.
- [ ] **Claim 4 · chains.** Object migrated `A → B → C`, late write arrives in shape `A`. Does lens
      composition fold it all the way, and is the composition still idempotent?
- [ ] **Claim 5 · genuine conflicts surface — but NOT as CRDT conflicts.** Premise corrected in
      review: when the mapping renames, the late write and the direct write hit _different keys_
      (`title` vs `name` — only the lens knows they correspond), and the fold is causally downstream
      of the direct write it just merged, so Automerge sees plain sequential overwrites and its
      conflict machinery never engages. The fold must detect the semantic conflict itself (target
      property changed since the migration heads) and record it at the application level instead of
      overwriting. Verify the detection, and that neither side is silently lost.
- [ ] **Claim 6 · fan-out converges via identity keys + the merge engine — NOT derived ids.**
      Premise falsified by the object-merging research (PR #12410,
      `.agents/projects/object-merging/DESIGN.md` §3.1/§4.5): two peers minting the same object id
      create two Automerge _documents_ with no shared ancestry; `links[id]` is LWW and the losing
      document is **silently orphaned** — their "collision class 1", an explicit error condition.
      Corrected mechanism: random id + derived **identity key** (`meta.key+version`,
      `<lensId>:<sourceId>:<role>`); duplicate creations collapse through their merge engine
      (min-`EntityId` winner, `mergedInto` redirect, transitive resolver). The migration case is the
      engine's best case — deterministic transform ⇒ identical duplicate content ⇒ field-granularity
      lossiness never bites. Their Phase 0 spike IS this claim's test; verify the class-1 orphaning
      once here (cheap) and otherwise adopt rather than duplicate their harness.
- [ ] **Claim 7 · what is the stable key for 1 → N?** Splitting a collection into N objects needs a
      per-element key. Position is not stable (a reorder changes it, and two peers whose lists merged
      differently disagree); a content hash is stable until the element is edited, at which point it
      mints a new object and orphans the old. **This is the sharpest unknown in the phase.** Check
      whether Automerge list-element identity serves — it is the same primitive the rich-text lens
      wants for stable block identity, so one mechanism may cover both.
- [ ] **Claim 8 · does a dangling relation degrade gracefully?** With no cross-object transaction
      there is a window where a created relation's target does not exist yet. Strong-deps suggests it
      simply does not surface; confirm. If it instead errors or blocks the subtree, write ordering
      becomes a hard requirement on the runner rather than a nicety.
- [ ] **Claim 9 · fan-out under a late write.** The §10.1 scenario applied to a split: an offline peer
      writes the _source_ property after the object was split. With identity keys, fold-forward needs
      **no find-or-create atomicity**: each folding peer creates with the derived key and the merge
      engine collapses duplicates ("create with key; the merge repairs races" — object-merging's
      `db.ensure` pattern reused). Verify the collapse, and settle what happens when the split's
      transform is partial (an unparseable value should leave the source in place and report, not
      create a half-populated object).
- [ ] **Claim 10 · fan-in collides; what resolves it?** Many sources converging on one target
      property contend by construction, where fan-out never does — two relations both supplying
      `assigneeName`. Confirm there is no defensible default and that the migration must declare the
      resolution.
- [ ] **Claim 11 · can a shared child be absorbed at all?** One `Address` referenced by three
      `Person`s fans in to three copies that then diverge and never reconverge. Fan-in needs referrer
      cardinality _before_ it runs. **The index question is answered**: the object-merging research
      documents the existing backlink index (SQLite `reverseRef`, surfaced as `Query.referencedBy()`)
      plus its gaps (markdown links, feed blocks, side maps, relation endpoints as bare EIDs). What
      remains to decide: whether a shared child blocks or duplicates, and whether the gap list is
      acceptable for the cardinality check.
- [ ] **Claim 12 · late entity _creation_, not just late writes.** An offline peer on the old schema
      adds an `Address` to a `Person` after the fan-in ran. Fold-forward must absorb an entity that
      did not exist at migration time. **Fan-out never surfaces this, and it is the most likely thing
      to break the bar — look at it before the cheaper claims give false confidence.**
- [ ] **Write up what survives** in DESIGN.md §10.3 — including, if it comes to it, the honest
      finding that the bar is unreachable and why.

### Phase M1 — integrate with the existing API: single-object, lens-backed

Small, shippable, and **does not meet the bar yet** — that is deliberate and must be documented, not
glossed. Scope is the migrations we already support: one object, one type, in place. Gated on the
lens landing in core (Phase 5), **not on M0** — the two run in parallel; the one coupling is the
heads format (below).

- [ ] **`Migration.fromLens(L)`** — the migration's `transform` is `Lens.get`. `Migration.define`
      with a hand-written `transform` stays for what a mapping cannot express.
- [ ] **Coverage reported at define time** — surface `dropped` as a reviewable diff before the
      migration runs. Today a `transform` that forgets a property drops it silently.
- [ ] **Apply as minimal writes**, not `atomicReplaceObject`. This is the single highest-value change
      in the phase: it stops a migration clobbering a concurrent edit to a property it never meant to
      touch, and it is the prerequisite for M2's fold-forward.
- [ ] **Verify before running** — `checkLaws` over generated instances of the source type.
- [ ] **Decide deletion here, not in M2: keep the source properties.** Found in review — minimal
      writes force the choice M2 was assumed to own. `atomicReplaceObject` dropped old properties
      implicitly; a minimal-write migration must either delete them explicitly or leave them. Leave
      them: they are what fold-forward (M2) folds, and deleting forfeits the bar before the research
      has run. Cost, owned knowingly: the object carries both shapes until compaction, and an old
      client keeps writing the old property with nothing folding it yet — that drift joins the
      residual-loss list below.
- [ ] **Per-object version stamping.** `EntityMeta.version` already exists and `transform` can
      already patch it atomically with the data. Moving off the single space-level
      `MigrationVersionAnnotation` scalar makes migration incremental, resumable and convergent, and
      makes "what is left to migrate" a query rather than a guess.
- [ ] **Record the migration's heads** on the object even though nothing reads them yet — M2 needs
      them, and objects migrated before M2 ships would otherwise be permanently unrecoverable. The
      one real M0 coupling: if claim 2 finds epochs/compaction invalidate raw heads, record whatever
      it finds durable instead (heads plus an epoch marker, or a snapshot of the source properties)
      — recording heads that a later epoch turns into noise would only look like safety.
- [ ] **Document the residual loss explicitly.** After this phase: a late write under the old schema
      is still lost; with source properties kept, old and new copies of a renamed field drift with no
      authority rule until M2 folds; and effectful `onMigration` still runs more than once. Say so in
      the API docs rather than letting it be discovered.

### Phase M2 — integrate the research: lossless, cross-object, fan-out, convergent

The full thing. Only starts once M0 has answered its claims; its shape depends on those answers.

- [ ] **Fold-forward on merge** (DESIGN.md §10.3) — the migration becomes a standing rule rather than
      an event, re-applied whenever old-shaped data appears. This is what meets the bar.
- [ ] **Deletion policy.** Old properties are retired by a separate later compaction, never by the
      migration itself — assuming M0 claim 1 says deletes lose to concurrent writes.
- [ ] **Cross-object migrations with effects as data** (DESIGN.md §10.5) — a migration declares a
      match (a tuple of objects) and _returns_ a write set addressed to them. Applied per object and
      non-atomically today; handed to a cross-object transaction when Automerge ships one, with no
      call site moving.
- [ ] **Fan-out, fan-in, merge and relations** (DESIGN.md §10.5) — the classes that create or destroy
      entities: 1 → N (split, extract-to-relation), N → 1 across types (absorb), N → 1 same type
      (dedup). `Write` grows a create/delete verb alongside the object address. **Creation stays out
      of `Lens.get`** — the migration creates and rewires, the lens then reads the resulting graph by
      composition (§11.2); putting creation in `get` would cost the purity the law check and the
      render path depend on.
- [ ] **Fan-in derived from fan-out, not authored twice** — a fan-out lens is bidirectional, so its
      `put` _is_ the fan-in and rollback is the same operation. It inherits `checkLaws` for free.
      Needs: a declared collision resolution (many sources, one target property), referrer
      cardinality before absorbing a shared child, and absorb-before-delete.
- [ ] **Derived identity keys required — depend on the object-merging engine** (PR #12410). A
      migration-created object gets a random id plus a derived `meta.key+version`
      (`<lensId>:<sourceId>:<role>`); convergence and idempotence come from that project's merge
      engine (Phases 1-2: `mergedInto` + resolver redirects + executor), not from id derivation —
      which their research shows routes through the class-1 LWW-orphaning error path. Reject keyless
      creation in a migration outright. Shared plumbing: their Phase 1 exposure of
      `ObjectCore.setSource`/`setTarget` is the same internal API fan-out-to-relation writes need.
      Flow back to them (DESIGN.md §10.5 "What flows back"): heads-diff folding for straggler edits
      at property granularity; minimal writes instead of `atomicReplaceObject` in the executor; a
      lens as the per-type merge policy their open question 3 asks for.
- [ ] **A stable key for 1 → N**, per M0 claim 7 — likely shared with the rich-text lens's block
      identity work.
- [ ] **Merge policy** — split by case per DESIGN.md §10.5: identity-key duplicates take the
      object-merging engine's min-`EntityId` rule wholesale (pure, proven convergent via monotone
      redirect chains); a migration-declared merge of distinct entities declares its primary side and
      reuses the engine's tombstone + redirect + opportunistic-rewrite machinery. The back-reference
      scan is answered (`Query.referencedBy`), and redirects make rewrite misses non-fatal, so
      completeness is no longer a correctness requirement.
- [ ] **Convergence strategy A as the default** (DESIGN.md §10.6): deterministic, idempotent, in
      place, no coordination. Force an explicit opt-out for anything effectful.
- [ ] **Strategy B where it fits** — don't migrate, read through the lens; the overlay already holds
      target-only fields. `Lens.promote(obj, lens)` drains the overlay into real properties when
      queryability is wanted. Needs the half-promoted-space policy (§10.7 q1).
- [ ] **Strategy C only on request** — leader election / swarm lease for effectful migrations, marked
      as such, requiring online.
- [ ] **Strategy D** — epochs demoted to compaction; correctness never depends on one. Must preserve
      whatever fold-forward needs (M0 claim 2).
- [ ] **Retire `onMigration`** for anything but declared effects.
- [ ] **The fold-forward trigger and its cost** (§10.7 q6) — "re-applied whenever old-shaped data
      appears" needs a concrete hook: a doc-change listener, the indexer, or query time. Each taxes a
      different hot path on every change to every object of a migrated type. Price it before
      committing to the standing-rule model.
- [ ] **Fold-forward window policy** (§10.7 q2) — how long migration heads and un-deleted old
      properties are kept, given a peer could always have been offline longer.

## `Lens.generate` — decision note

Recorded at this length because "propose a draft mapping" reads far more valuable than it is, and the
call turns on _when_ it pays rather than on whether it works. Rationale in DESIGN.md §3 D3; this is
the version you can decide from.

**What it is.** A scaffolding step run once, in a script, while writing a new lens — not a runtime
feature and not part of the lens model. It takes two declared types and emits a draft mapping plus a
list of holes: the correspondences it recovered, and the places it refuses to guess.

```ts
const draft = Lens.generate(LinearIssue, Task.Task);
console.log(Lens.printMapping(draft));
```

```
// 1 automatic · 1 proposed · 2 holes · 1 dropped
Lens.make('org.dxos.lens.linear-issue-as-task', LinearIssue, Task.Task, {
  // title — automatic (String → String, same name). Omitted on purpose.

  // PROPOSED · the literal sets differ in size; 'canceled' has no target. Verify.
  status: Lens.from('state', Lens.lookup({ backlog: 'todo', started: 'in-progress', completed: 'done' })),

  // HOLE · source `priority` is a bare number 0-4; `Task.priority` is a 5-option SingleSelect.
  //        Direction and base index are not recoverable from either schema.
  priority: Lens.hole('priority'),

  // HOLE · `estimateMinutes` and `estimate` are both plain numbers. Neither declares a unit.
  estimate: Lens.hole('estimateMinutes'),
})
// Dropped from the source: assigneeEmail — Task.assigned is Ref(Person), not a string.
```

You paste it, replace the `Lens.hole(...)` markers, and run `Lens.checkLaws`. `hole` must be a real
value that throws on `get`, so an unfilled draft fails loudly instead of silently overlaying.

**The value is the split, not the codegen.** Three buckets, and only the middle one costs a human
anything: recovered for free (identity, renames, identical enum sets — `compatible()` already
computes this); proposed-but-flagged (an ordered `SingleSelect` option list makes an ordinal map
plausible, never certain); and holes. A property with _no_ counterpart is silent — it falls through
to overlay and that is correct. A property with a _plausible_ counterpart whose value mapping cannot
be inferred must stay an unfilled hole, or it silently overlays and drifts.

**What it can never do**, so nobody re-litigates it: recover value semantics. Nothing in either
schema says `done === (status === 'done')` rather than `status !== 'todo'`, or that
`estimate` is minutes. Those two are precisely the interesting content of the Task lens — a useful
reality check on how much generation can carry.

**Accepting a proposal is only safe because verification is mechanical.** `checkLaws` over instances
built from the source type's own `GeneratorAnnotation`s (`createProps` in `@dxos/schema/testing`);
`Task` annotates every property, so it is property-based verification with zero fixtures. A wrong
`lookup` direction fails there, immediately.

### When to take it on

**Not for one lens.** `GtdLens` is ~15 lines; generating it saves maybe eight. Take it on when the
count does:

- a connector package with a dozen-plus foreign types to map onto canonical ones (the
  "External-protocol lenses" backlog item above is the trigger to watch);
- a migration lensing many types onto their successor shape;
- an agent authoring lenses — the holes _are_ the prompt (names, `title`s, descriptions are the
  hints), and panproto already ships an MCP server aimed at this.

**Cost.** Moderate and mostly not novel: mapping resolution and compatibility already exist
(`lens/mapping.ts`), and panproto ships a `lens generate` for the structural half. The new work is
the hole vocabulary, the printer, and generator-driven `checkLaws`.

**Do this first instead.** "Richer source annotations" (Phase 5) — starting with units — is what
would move `estimate` out of the hole bucket entirely, and it pays off in forms, agents, and
validation whether or not generation is ever built. Building the generator against today's
annotations mostly produces a tool that reports holes we could have removed at the source.

## References

- [DESIGN.md](./DESIGN.md) — first-class API (§2), derivation graded D1–D4 (§3), the two lenses
  (§5), model and concurrency rule (§6), the four stories (§7).
- panproto: https://github.com/panproto/panproto · book https://panproto.dev/book/ ·
  toolkit https://github.com/panproto/panproto-toolkit
