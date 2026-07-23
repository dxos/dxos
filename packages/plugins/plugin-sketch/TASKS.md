# plugin-sketch — Tasks

_Resume: PR #12324 — Check GREEN, preview https://pr-12324-composer-main.dxos.workers.dev; respond to review comments (only bot stubs so far), then land (land skill). Uncommitted: none. Last: PR opened + CI green._

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
- [ ] **Excalidraw backend** — second compiler `Scene → ExcalidrawElementSkeleton`.
- [ ] **Dialects** — `mermaid` / `d2` / `sequence` / `uml-class` compilers → scene commands (auto-layout owned per dialect).
- [ ] **`rename-object` command** (D2 Oracle Rename: rewrite record ids + meta + bindings) and object re-`scale`.
- [ ] **tldraw group shapes** for world objects (native drag-as-unit); object/element rotation.

### References

- Design: `agents/superpowers/specs/2026-07-23-sketch-scene-dsl-design.md` (incl. project log: start 04:48 UTC, live-verified 05:47–05:51 UTC).
- Storybook: `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx` (serve: `pnpm exec storybook dev --port 9019` from stories-assistant).
