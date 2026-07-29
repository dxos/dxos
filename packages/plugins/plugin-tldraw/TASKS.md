# plugin-tldraw (né plugin-sketch) + plugin-illustrator — Tasks

_Resume: Phase 3 (illustrator base) COMPLETE on PR #12380 (branch claude/headless-diagramming-plugin-84ef17, head aaf24e4) — final CI run in flight, all package gates green, both new packages published to npm at 0.10.0. Next: land #12380 (land skill; user lands), then Phase 4 = technical-drawing dialect. OPEN DECISION for Phase 4: source of truth = one-shot compile vs live model (recommended) vs hybrid._

## Phase 1: Scene DSL (agent draws/edits diagrams)

Backend-neutral scene DSL (world objects → elements in local units) compiled to
tldraw records with identity in record `meta`, driven by the agent through
read/edit operations and the `org.dxos.skill.sketch` skill. Design:
`agents/superpowers/specs/2026-07-23-sketch-scene-dsl-design.md`; as-built:
`PLUGIN.mdl` (F-8, T-7/T-8).

### Tasks

- [x] **Design doc + prior-art survey** — PIC/Pikchr, SVG, D2 (+ D2 Oracle edit API), Mermaid, Kroki, Excalidraw skeleton; three-layer architecture (scene IR → dialects → backends).
- [x] **Promote SketchBuilder to `src/model/`** — extended with meta stamping, index seeding, `path()` (polyline/spline), external boxes, `records()`; call sites updated, `#testing` export removed.
- [x] **Scene model** — `scene.ts` (Effect Schema), `render.ts` (→ tldraw, deterministic `shape:<object>/<element>` ids), `read.ts` (derived origins from bboxes), `apply.ts` (upsert/remove/move commands, binding cleanup), `dialect.ts` (registry; `scene` only).
- [x] **Operations** — `SketchOperation.Read` / `Edit` + handlers (`Database.Service`, atomic `Obj.update`); create kept.
- [x] **Skill** — `org.dxos.skill.sketch` (tools + DSL instructions: local units, semantic ids, read-before-edit); wired via `addSkillDefinitionModule`.
- [x] **Tests** — 15 green: scene round-trip, tldraw schema validation, binding cleanup, unmanaged shapes, operations integration (create → edit → read via real Database layer).
- [x] **Live-AI storybook** — stories-assistant `Sketch` group (`Reflection` first, then `Default`, `DrawAndUpdateTest`); layout chat | canvas | trace; hardened `submitPrompt` (retries until the message lands in the thread). Live-verified 2026-07-23 (remote EDGE, claude-opus-4-8): hat composed on untouched face.
- [x] **PLUGIN.mdl updated post-implementation** — record of the as-built system (convention change also captured in the composer-plugins skill).

## Phase 2 (future)

- [x] **Open PR** — #12324 (changeset `sketch-scene-dsl.md`, minor bump for @dxos/plugin-sketch).
- [x] **Excalidraw backend** — excalidraw builder (elements + customData identity, label companions, positional arrows with remembered refs) in plugin-excalidraw.
- [ ] **Dialects** — `mermaid` / `d2` / `sequence` / `uml-class` compilers → scene commands (auto-layout owned per dialect).
- [ ] **`rename-object` command** (D2 Oracle Rename: rewrite record ids + meta + bindings) and object re-`scale`.
- [ ] **tldraw group shapes** for world objects (native drag-as-unit); object/element rotation.

### References

- Design: `agents/superpowers/specs/2026-07-23-sketch-scene-dsl-design.md` (incl. project log: start 04:48 UTC, live-verified 05:47–05:51 UTC).
- Storybook: `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx` (serve: `pnpm exec storybook dev --port 9019` from stories-assistant).

## Phase 3: plugin-illustrator base extraction (2026-07-28)

Game/Chess-style split: headless host plugin + renderer variant plugins.

- [x] **plugin-illustrator (new)** — base `Sketch` type (`org.dxos.type.sketch`, `{name?, canvas: Ref<Obj.Unknown>}`), `SketchRef`/`loadSketch`/`resolveVariant`, scene DSL + dialect registry moved in, sketch skill + create/read/edit operations (renderer-agnostic via `Capability.Service`), `IllustratorCapabilities.VariantProvider`, SketchArticle/SketchCard dispatch containers, CreateSketchPanel variant picker.
- [x] **plugin-sketch → plugin-tldraw rename** — package/dir/plugin key (`org.dxos.plugin.tldraw`), `TldrawBuilder`, `Tldraw.Canvas` keeps `org.dxos.type.canvas` (no data migration; ECHO migration framework is dormant), contributes VariantProvider (builder + TldrawArticle/TldrawCard), useStoreAdapter takes the canvas directly.
- [x] **plugin-excalidraw onto the base** — dropped its root `Excalidraw` type + create operation; keeps `org.dxos.type.excalidraw.canvas`; new scene-DSL builder (style maps, render/read/apply); contributes VariantProvider (article only).
- [x] **Consumers updated** — composer-app (Illustrator/Tldraw/Excalidraw plugins registered, assets → `/assets/plugin-tldraw`), plugin-debug, plugin-markdown/plugin-stack stories, plugin-onboarding exemplar, stories-assistant Sketch story, storybook-react static dirs, tsconfig/paths/changeset config.
- [x] **Tests** — identical create→edit→read round-trip runs against BOTH builders (tldraw + excalidraw) via `AssistantTestLayer` + `extraServices` capability layer; 15 tldraw tests green, 2 excalidraw green.
- [x] **Open PR** — #12380 (changeset `illustrator-base-plugin.md`); CI green through `aaf24e4` bar the final in-flight run.
- [x] **First publish** — `@dxos/plugin-illustrator` + `@dxos/plugin-tldraw` published at 0.10.0 (2026-07-28, burdon) with npm trusted publishing configured; both packages public, plugin-debug depends on them normally, `check-packages-published` green.
- [ ] **Land #12380** — user lands (land skill); do not merge unprompted.

## Phase 4 (next): technical-drawing dialect

Mermaid/UML-flavoured text dialect **extended with placement metadata**, compiled through the
illustrator dialect pipeline. Requirements from the 2026-07-28 brainstorm: hierarchical with
infinite zoom; nodes tied to source (e.g. code) for generation; groups contain classes and
collapse; automatic layout + line routing with smart slots on nodes; preserve straight lines;
scenarios (arc visibility varies per scenario / selected node, toggleable); embedded text.
Reference sketch: `packages/plugins/plugin-illustrator/docs/drawing.drawio.svg`.

- [ ] **DECIDE: source of truth** — (a) one-shot compile: DSL → scene commands → ordinary
      editable records (current dialect architecture, but collapse/scenarios/zoom cannot survive as
      behaviours); (b) **live model (recommended)**: persist the DSL/parsed graph on the object and
      compile view-state (zoom, collapsed groups, active scenario, selection) + model → records on
      the fly, with manual edits round-tripping into placement metadata; (c) hybrid — live model plus
      a "detach to sketch" that bakes the current view. Blocks the rest of Phase 4.
- [ ] **Dialect + placement schema**, layout/routing engine (slots, straight-line preservation),
      scenario model, collapse/zoom behaviour.
- [ ] **Excalidraw native arrow bindings** — replace positional arrows + customData refs with real start/endBinding + boundElements sync.
- [ ] **Illustrator PLUGIN.mdl deepening** — document capability contract once the dialect work firms it up.

### Post-review fixes (2026-07-28, user testing)

- [x] **dependsOn auto-enable** — plugin-tldraw/plugin-excalidraw declare `dependsOn: ['org.dxos.plugin.illustrator']`; the plugin manager enables the closure.
- [x] **LiveObject crash on create** — `useObject` returns snapshots; dispatch containers now pass `ref.target` (live) since store adapters need `Doc.createAccessor`.
- [x] **Lost strokes (pre-existing)** — tldraw's `'event'` stream fires before the tool commits its shape, so pointer_up-driven saves flushed one gesture behind; plus the attention-triggered adapter reopen recreated the store under a still-mounted editor. Fixed: debounced auto-save in the store listener, editor keyed by store instance, flush-on-unmount. Verified live: cold load → draw → reload → stroke persists.

### Phase 3.1: Drawing rename + shared canvas (2026-07-29)

- [x] **`Sketch` → `Drawing`** — `org.dxos.type.sketch` → `org.dxos.type.drawing`; `SketchBuilder` → `DrawingBuilder`, `SketchVariant` → `DrawingVariant`, `SketchOperation` → `DrawingOperation`, containers/panel/skill renamed to match.
- [x] **`schema` + `content` pushed into the base type** — illustrator owns `Drawing.Canvas` (`org.dxos.type.canvas`, hidden); tldraw's and excalidraw's canvas types are deleted, and `DrawingVariant.canvasType`/`createCanvas` are now optional for renderers that need no extra fields (neither does today).
- [x] **Variant resolution keys on `Canvas.schema`** — forced by the collapse: with one shared canvas type, typename no longer discriminates. `makeCanvas` takes a REQUIRED `schema` so a canvas can never be built unresolvable (this caught 8 call sites that would have silently rendered "Unsupported drawing variant").
- [x] **Common content-map logic factored out** — `illustrator/model/content.ts` owns the upsert/remove/move command loop, companion-record accounting and index seeding; renderers supply a `ContentHandler` (`identify`/`render`/`read`/`translate` + optional `scaffold`/`merge`/`prune`). Both `apply.ts` files deleted (~130 duplicated lines each). tldraw's page scaffold + dangling-binding sweep and excalidraw's version bumps survive as handler hooks.
- [x] **`DrawingBuilder` implemented by both** — `makeBuilder({schema, handler})` supplies the ECHO write path; `TldrawBuilder` (record builder renamed `RecordBuilder`) and `ExcalidrawBuilder`. Both variant round-trip tests still pass unchanged, which is the evidence the extraction is behaviour-preserving.
- [ ] **Migration for `org.dxos.type.sketch` → `org.dxos.type.drawing`** — NOT written; existing sketches will not resolve. The ECHO migration framework is dormant (composer-app migrations commented out).
- [ ] **PLUGIN.mdl files** still describe the Sketch-era shape.

### Phase 3.2: mermaid dialect + migration (2026-07-29)

- [x] **`sketch` → `drawing` migration** — CORRECTION: the migration framework is NOT dormant. `Migration.define` is live and wired through `ClientCapabilities.Migration` (precedent: plugin-assistant). `LegacySketch.Sketch` (`org.dxos.type.sketch`) migrates to `Drawing`; the canvas keeps its typename so only the wrapper converts. Runs via `db.runMigrations` per space, idempotent.
- [x] **CollectionModel.add audit** — no plugin needed changes. `Journal` and `Subscription` are VISIBLE (their hidden siblings are `JournalEntry`/`PostContent`); `Segment` and `Variant` are hidden but persisted with `db.add`, never `AddObject`; sandbox has no `AddObject` sites. Chess/TicTacToe state go through plugin-game and are now correctly persisted-but-unfiled.
- [x] **Mermaid dialect** — `illustrator/model/mermaid.ts`: parses flowchart direction, node shapes, subgraphs and edges; ranks by longest path with DFS back-edge detection so `C --> Y --> C` doesn't chase the loop; emits one world object per node, a dashed frame per subgraph, and an `edges` object of bound arrows. `DrawingOperation.Generate` applies it through the variant builder.
- [x] **Tests/storybooks** — generic mermaid unit tests in plugin-illustrator (6, incl. the reference flowchart); mermaid storybooks in plugin-tldraw and plugin-excalidraw.
- [ ] **Excalidraw label rendering** — the compiler emits correct label text companions (unit-tested), but they do not appear on the excalidraw canvas; suspect a text-element field/font issue in the excalidraw component.
- [ ] **Layout quality** — the hand-rolled layered layout does no crossing minimisation and arrows meet box centres. See the ELK/routing research.

### Tracked follow-ups

- [x] **Hidden canvas showed as a second navtree item** — creating a sketch _inside a Collection_ listed the canvas beside it. Not variant-specific: `CollectionModel.add` pushed into `target.objects` unconditionally when the target was a collection, ignoring `HiddenAnnotation` (the non-collection branch calls `Database.add`, which is why creating at the space root looked fine). **Fixed systematically** in `@dxos/app-toolkit`: `CollectionModel.add` now persists a hidden object without filing it into any collection, so no plugin can leak an implementation-detail object into the navtree. Regression tests in `CollectionModel.test.ts`.
- [x] **Same latent bug in plugin-game** — `create-object.ts` routes the hidden `Chess.State` through `AddObject`; covered by the `CollectionModel.add` fix above, so plugin-game needs no change. Illustrator likewise keeps its plain `AddObject` call.
- [x] **Library button removed from Excalidraw** — no `UIOptions` toggle exists and `renderTopRightUI` only _adds_ to the top-right tunnel, so `.default-sidebar-trigger` is hidden via a scoped `theme.css` loaded after excalidraw's stylesheet. Verified in the plugin storybook (element present, `display: none`).
- [ ] **react-ui-debug LogPanel misses errors** (plugin-debug) — LogPanel doesn't catch errors like the Doc.createAccessor LiveObject throw; needs a context that keeps collecting logs even while the panel isn't visible. (tracked 2026-07-28)
