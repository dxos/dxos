# plugin-tldraw (né plugin-sketch) + plugin-illustrator — Tasks

_Resume: Phase 3 (illustrator base extraction) implemented on branch claude/headless-diagramming-plugin-84ef17; PR pending. Next after landing: technical-drawing dialect (mermaid/UML variant with placement metadata — hierarchy, zoom, scenarios, slots)._

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
- [ ] **Open PR** — #12380 (changeset `illustrator-base-plugin.md`).
- [ ] **First publish** — maintainer: publish `@dxos/plugin-illustrator` + `@dxos/plugin-tldraw` with trusted publishing, then flip `private: true` off and move plugin-debug's deps back to `dependencies` (CI gates: check-packages-published vs check-public-dependencies).
- [ ] **Technical-drawing dialect** — mermaid/UML variant with placement metadata; hierarchical zoom, source-linked nodes, collapsible groups, auto-layout + slot routing, scenarios. NOT in this phase.
- [ ] **Excalidraw native arrow bindings** — replace positional arrows + customData refs with real start/endBinding + boundElements sync.
- [ ] **Illustrator PLUGIN.mdl deepening** — document capability contract once the dialect work firms it up.

### Tracked follow-ups

- [ ] **react-ui-debug LogPanel misses errors** (plugin-debug) — LogPanel doesn't catch errors like the Doc.createAccessor LiveObject throw; needs a context that keeps collecting logs even while the panel isn't visible. (tracked 2026-07-28)
