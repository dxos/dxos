# Sketch Scene DSL

Status: implemented on `claude/sketch-diagram-dsl-abe69c` (as-built record: `plugin-sketch/PLUGIN.mdl` F-8/T-7/T-8).
Author: Claude (session with Rich), 2026-07-23.

Verification note: unit + operation-level integration tests pass
(`src/model/scene.test.ts`, `src/operations/operations.test.ts` — the latter runs
the create → edit → read loop through the real Database layer). The live-AI
storybook renders (chat + tldraw canvas, skill and sketch bound to context), but
the end-to-end model round-trip could not be exercised from this environment: the
pre-existing `Chat → Default` story exhibits the same symptom (submitted prompts
never reach the thread; zero invocation events), so the blocker predates this
change — run `Sketch → DrawAndUpdateTest` manually once the remote stack works.

A backend-neutral mini-DSL that lets an agent create, edit, and delete diagrams
in `plugin-sketch`. The agent thinks in terms of _world objects_ ("face",
"hat") composed of _graphical elements_ (rect, ellipse, line, curve, text) in
object-local coordinates; a compiler maps the scene onto the concrete canvas
implementation (tldraw today, Excalidraw later).

## Motivation

- `SketchBuilder` (previously `src/testing/`) already generates tldraw record
  maps but is tldraw-specific, test-only, and append-only (no edit/delete).
- The assistant needs a stable, semantic vocabulary to _iterate_ on a drawing:
  "draw a face" then "add a hat" then "make the smile bigger" — without ever
  seeing tldraw records. The LLM maintains a mental model of the scene, not of
  the underlying store.

## Prior art

Text-to-diagram languages all share one architecture: **dialect → intermediate
positioned model → renderer**.

| System                          | Lesson taken                                                                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PIC (Kernighan '82) / Pikchr    | Named objects addressed after creation; object-relative placement.                                                                                                                                                                                                                           |
| SVG                             | The neutral scene model: primitives + `<g translate/scale>` groups with ids. Our object/element split is a one-level SVG group tree.                                                                                                                                                         |
| D2 (d2lang.com)                 | One grammar; dialects triggered in-language (`shape: sequence_diagram`, `sql_table`, `class`); layout engines pluggable and decoupled.                                                                                                                                                       |
| D2 Oracle (d2lang.com/tour/api) | Programmatic edit API over the graph: Create / Set / Delete / Rename / Move addressed by **key id**, built for incremental bidirectional IDE edits without recompiling the source. Directly validates our id-addressed edit-command layer; motivated adding `move-object` (Rename deferred). |
| Mermaid                         | First token selects a dialect grammar; each dialect owns parser + layout over a shared rendering core.                                                                                                                                                                                       |
| Kroki                           | Registry of independent diagram DSLs behind one uniform interface.                                                                                                                                                                                                                           |
| Excalidraw `ElementSkeleton`    | Flat JSON element list purpose-built for programmatic generation; arrows bind via `start/end: {id}`.                                                                                                                                                                                         |
| tldraw shape partials           | Flat records (`geo`, `line`, `arrow` + bindings, `text`); styles color/fill/dash/size.                                                                                                                                                                                                       |
| plugin-mermaid (in-repo)        | Rendering-only CM widget (mermaid source → opaque SVG). Validates a future `mermaid` _dialect_ that would instead compile to native, editable shapes.                                                                                                                                        |

## Architecture

Three layers:

```
dialect input ──compile──▶ Scene (neutral IR) ──backend──▶ canvas records
 (scene | mermaid | …)      objects/elements               (tldraw | excalidraw)
```

1. **Scene IR** — Effect-Schema types, no tldraw imports. The `scene` dialect
   _is_ the IR (identity compile); the agent emits it directly.
2. **Dialects** — a `Dialect` is a compiler `input → Scene`. v1 defines the
   interface and registers only `scene`. Future: `mermaid`, `d2`, `sequence`,
   `uml-class` — each owns its layout (Mermaid-style), and its output lands as
   ordinary world objects (stamped `meta.dialect`) so it stays editable.
3. **Backends** — `Scene → tldraw records` built on the promoted
   `SketchBuilder`. Element identity is stamped into record `meta` so
   edit/delete-by-id round-trips. Excalidraw compiler slots in later.

### Scene model

```ts
Scene        = { objects: WorldObject[] }
WorldObject  = { id, origin: {x, y}, scale?: number, elements: Element[] }
Element      = { id, kind, ...geometry in object-local units, style?, text? }
```

Element kinds (neutral vocabulary, intersection of tldraw/Excalidraw):

| Kind       | Geometry                                        | tldraw mapping    | Excalidraw (later)    |
| ---------- | ----------------------------------------------- | ----------------- | --------------------- |
| `rect`     | x, y, w, h                                      | geo:rectangle     | rectangle             |
| `ellipse`  | x, y, w, h                                      | geo:ellipse       | ellipse               |
| `circle`   | cx, cy, r (sugar)                               | geo:ellipse       | ellipse               |
| `diamond`  | x, y, w, h                                      | geo:diamond       | diamond               |
| `triangle` | x, y, w, h                                      | geo:triangle      | closed line           |
| `line`     | points[2]                                       | line spline:line  | line                  |
| `polyline` | points[], closed?                               | line spline:line  | line                  |
| `curve`    | points[], smooth                                | line spline:cubic | line w/ roundness     |
| `arc`      | cx, cy, r, startAngle, endAngle (sugar → curve) | line spline:cubic | line                  |
| `text`     | x, y, w?, text                                  | text              | text                  |
| `arrow`    | from/to element refs or points                  | arrow + bindings  | arrow + start/end ids |

Styles (abstract, both backends can express): `color` (named palette from
`SketchBuilder.Color`), `fill` (`none | solid | pattern`), `stroke`
(`solid | dashed | dotted | sketchy`), `weight` (`s | m | l | xl`), plus
`text` labels on closed shapes.

Arrow refs: `to: 'mouth'` (same object) or `to: 'hat/brim'`
(cross-object, `objectId/elementId`).

### Coordinates and units

- Elements are authored in **object-local units**; recommended envelope is a
  ~100-unit box per object.
- `WorldObject.origin` is in canvas px; `scale` (px per unit, default 1) maps
  local → canvas: `abs = origin + local * scale`.
- **Read derives, not stores**: an object's `origin` is the top-left of the
  bounding box of its live records; local coords are
  `(abs − origin) / scale`. Users can drag shapes (or whole objects) in the
  UI and the agent's next `Read` still sees a coherent scene — the mental
  model survives concurrent human edits. `scale` is stamped in `meta` at
  render time (first element wins on read).

### Identity

Every generated tldraw record carries:

```ts
meta: { object: 'face', element: 'left-eye', scale: 1, dialect: 'scene' }
```

- Record id is deterministic: `shape:<object>/<element>` — replacing an
  element reuses its id (bindings stay valid); deleting removes the key.
- Object deletion = remove all records with `meta.object === id` (and any
  bindings referencing them).
- Records without our meta (hand-drawn by the user) are invisible to
  `Read`'s object list but reported as an `unmanaged` count so the agent
  knows the canvas has other content.

## Operations

`SketchOperation.Edit` — batch of commands applied atomically in one
`Obj.update` on `Canvas.content`:

| Command           | Semantics                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upsert-object`   | Replace-or-create a whole world object (its records are regenerated). Omitting `origin` on an existing object keeps its current (derived) origin. |
| `upsert-elements` | Add or replace specific elements of an existing object by id.                                                                                     |
| `remove-elements` | Delete elements by id.                                                                                                                            |
| `remove-object`   | Delete the object and all its records.                                                                                                            |
| `move-object`     | Translate an object to a new origin (records shifted by the delta; elements untouched). D2-Oracle-style Move.                                     |

`SketchOperation.Read` — returns the derived `Scene` (+ `unmanaged` count).
This is what lets the LLM "remember" the drawing across turns without ever
seeing tldraw internals.

`SketchOperation.Create` — unchanged (kept).

Both new operations require `Database.Service` and take a `Ref(Sketch.Sketch)`
(the handler loads the canvas through the ref).

## Skill

`org.dxos.skill.sketch` (`src/skills/sketch-skill.ts`), wired via
`addSkillDefinitionModule`. Instructions cover:

- The world-object / element vocabulary and unit conventions.
- Semantic ids (`face`, `left-eye`) — required for later edits.
- Workflow: `read` before editing an existing sketch; prefer
  `upsert-elements` / `remove-elements` for incremental changes; reserve
  `upsert-object` for new objects or wholesale redesign.
- Layout guidance: agent does the spatial reasoning (compose objects in a
  100-unit box; place origins so objects relate sensibly).

## SketchBuilder promotion

- Moves `src/testing/SketchBuilder.ts` → `src/model/SketchBuilder.ts`
  (production; `#model` import path; no compat re-exports — call sites
  updated).
- Gains the ability to emit records for merging into an _existing_ canvas
  (explicit ids, meta pass-through, fractional indexes seeded past existing
  content) instead of only whole-snapshot `build()`.
- `src/model/` layout:
  - `scene.ts` — Scene/WorldObject/Element schemas.
  - `render.ts` — `Scene`/object → tldraw records (uses SketchBuilder).
  - `read.ts` — records → derived Scene.
  - `dialect.ts` — `Dialect` interface + registry; `scene` dialect.
  - `SketchBuilder.ts` — promoted builder.

## Storybook (live AI)

`packages/stories/stories-assistant`:

- `SketchModule` (mirrors `ChessModule`) + `Module.Sketch` role token.
- `Sketch.stories.tsx`:
  - **Default** — `[[Module.Chat], [Module.Sketch]]`, `config.remote` (live
    EDGE AI), lazy `SketchPlugin`, seeded empty Sketch, `skills:
[AssistantSkill, SketchSkill]`. Interactive prompting.
  - **SequenceTest** (`tags: ['!test']`, play) — submits "Draw a simple
    face…" via the chat editor, waits for records with
    `meta.object === 'face'`; then "Add a hat…", waits for `hat` records
    **and asserts the face records survived** — proving the model edited the
    scene from its mental model rather than rebuilding.
  - **Reflection** (`tags: ['!test']`, play) — submits a prompt asking the
    model to draw how it feels about this project.

## Testing

- `src/model/*.test.ts` — scene → records → scene round-trip; upsert/remove
  merge semantics; arc/circle sugar; arrow binding resolution (incl.
  cross-object refs); unmanaged-record handling.
- Operation handler tests via Effect test layers (follow plugin-voxel).
- Storybook play test for the live loop is manual (`!test`).

## Future work (out of scope for this branch)

- Excalidraw backend compiler.
- `mermaid` / `d2` / `sequence` / `uml-class` dialects (auto-layout).
- `rename-object` command (D2 Oracle Rename: rewrite record ids + meta + bindings).
- Object re-`scale` without resending elements (`move-object` covers translation only).
- tldraw `group` shapes for world objects (native drag-as-unit).
- Rotation on objects and elements (elements accept `rotation` where the
  backend supports it; object-level rotation deferred).

## Implementation plan

1. Design doc (this file) + skill/memory updates re PLUGIN.mdl role. ✔ when committed.
2. `src/model/` — schemas, promoted builder, render/read, dialect registry; unit tests.
3. Operations `Edit` + `Read` + handlers; tests.
4. `sketch-skill` + capability wiring.
5. stories-assistant module + stories.
6. Verify (build/lint/test/format, storybook smoke), then update
   `plugin-sketch/PLUGIN.mdl` to record what was built. PLUGIN.mdl is a record
   of the built system, not a working document.

### Project log

Token counts summed from this session's transcript
(`~/.claude/projects/…sketch-diagram-dsl-abe69c/*.jsonl`); cache figures are
prompt-cache traffic, not billed like fresh input.

|                    |                            |
| ------------------ | -------------------------- |
| Start              | 2026-07-23 04:48 UTC       |
| End                | 2026-07-23 05:35 UTC       |
| Output tokens      | ~349k                      |
| Fresh input tokens | ~1.6k (+1.47M cache-write) |
| Cache-read tokens  | ~82.6M                     |
