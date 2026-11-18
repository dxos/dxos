# Diagram object model: DSL as the source of truth

Status: design, with stages 1 and 2 implemented — a box carries the contributed kind it is (`kind=card`) and that
kind's own scalar fields, so the nine slides below survive records → text → records with every kind intact.

The studio deck (`plugin-canvas/src/experimental/studio`) is the use case this came out of: nine slides
rebuilt as canvas drawings, which exercised every seam below and broke at each one. The slides are not the
deliverable — what they found is.

## The goal

```
DSL text  ⇄  object model (serializable)  ⇄  builder API
                     │
                     └──► renderer
```

1. The DSL is the source of truth. A document can be written, read and edited as text.
2. Agents and humans author by editing the DSL.
3. A builder API constructs the same model; builder and DSL are isomorphic.
4. The renderer draws the object model, not a translation of it.

## What is true today

```
.spec.ts ──build──► ContentMap records ──► renderer
                          │
                          └──print──► DSL ──parse──► Scene.Scene ──► (lossy) records
```

Three findings, each measured on the Hyperspace slide:

1. **There are two object models.** `Scene.Scene` / `Shape.Element` in `@dxos/diagram`, and the canvas's
   `ContentMap` layout records in `@dxos/react-ui-canvas`. `SceneHandler` translates. Fidelity dies at that
   boundary: 41 managed records print as 16 objects.
2. **The renderer reads the records**, so the scene model is already a projection, not the truth.
3. **The builder bypasses the model.** `seedSlideSpec` writes `ContentMap` records directly, so a drawing it
   builds was never expressible as text.

Measured loss, Hyperspace:

|             | drawn | in the DSL, before | after stage 1 |
| ----------- | ----- | ------------------ | ------------- |
| `card`      | 10    | 0                  | 10            |
| `plank`     | 3     | 0                  | 3             |
| `substrate` | 1     | 0                  | 1             |
| `rect`      | —     | 15                 | 6             |

Before stage 1 every kind printed as `rect` and `Rebuild` reported "20 drawn, 21 removed", replacing the drawing
with plain boxes. Stage 1 puts `type` and a `data` bag on `Shape.Box`, spells them `kind=card tone=event` in the
DSL, and maps them both ways in `SceneHandler`; a corpus test over all nine slides asserts that every contributed
kind keeps its exact count through records → text → records, and fails on nine slides without the mapping.

Stage 2 did the same for links. A link on a plain canvas keeps its markers and line style on itself and only a
routed link carries a connector, so `read` — which looked at the connector alone — returned 51 of the deck's 64
connectors as a default arrow rather than the triangle they were drawn with, and dropped 13 dashed strokes. An
arrow now also states its own bends (`arrow link a -> b via 10,20 30,20`), which a connector routed by hand or by
a layout had no spelling for at all: 14 connectors and 66 bends were lost on every trip through the text, and the
sidecar carried them precisely because the DSL could not.

Two gaps remain, each asserted in `handler.test.ts` so they stay measured:

1. a kind field holding a **list or nested object** has no spelling in either DSL layer — `scene-model.ts`
   declines one too, rather than printing a list as a string the reader hands back as a string;
2. a kind's remaining **top-level fields** (a card's `icon`, `body`, `footer`) are not carried at all: placing a
   name back on the right side of the `data` split needs the kind's own schema, which only the registry holding
   the kind has. Those three are the card's composite-template parts, which is where the design puts them.

A field whose name an element attribute already claims is no longer a gap: it is escaped rather than dropped.
`substrate` keeps a numeric `fill` against the style attribute, and that field is the density its hexagon is drawn
at, so dropping it flattened the drawing to a uniform field of dots. It is written `data-fill=0.55`, and the
prefix escapes itself.

Measured in the running story, which is where it counts. Seeded, Hyperspace draws 10 cards, 3 planks, 1 substrate,
10 card icons, 9 substrate spaces and 2 routed connectors. After `Rebuild` — the full records → text → records
cycle — it draws all of them except the icons and the spaces. Before stage 1 the same `Rebuild` left no cards, no
planks and no substrate at all.

### What a value grammar would have to spell

Both remaining visible losses are gap 1, and the shapes are worth knowing before anything is designed for them.
Every non-scalar field across the nine slides:

| Field              | Shape                                     | Count |
| ------------------ | ----------------------------------------- | ----- |
| `card.icon`        | `{type}`                                  | 87    |
| `chip.icon`        | `{type}`                                  | 5     |
| `card.chips`       | `{items}` / `{cols,columnGap,flat,items}` | 3     |
| `app-frame.colors` | `{canvas,comp,doc,nav,sheet}`             | 1     |
| `substrate.lit`    | `[{tone,x,y}]`                            | 1     |
| `substrate.spaces` | `[{r,x,y}]`                               | 1     |

**92 of 96 are `{type}`** — a one-field object holding a glyph name, which is the whole of the icon loss. So the
choice is not between "a value grammar" and "no value grammar":

1. **A braced value** — `icon={type=ph--calendar--regular}`, `spaces=[{x=1 y=2 r=3} …]`. General, unambiguous,
   covers all six shapes, and extends `AttrValue` permanently.
2. **The glyph alone** — a one-field object collapses to its value. Covers 92 of 96 with no grammar change, but it
   needs the kind's schema to know the field's name on the way back, which is gap 2's blocker.
3. **Neither, for now** — the icon and the spaces are template parts and generator params respectively, and the
   design already moves both out of node fields. Closing gap 2 (the composite template) would remove most of this
   case rather than spelling it.

### Decision: no value grammar, because the scene DSL is not a round-trip format

Option 3. The fields that would need one are not node fields for much longer: `chips`, `colors` and the
substrate's `show` belong to composite templates and generator params, which the design already moves off the
node. The icon needs nothing at all — `iconOf` already accepts a bare string
(`react-ui-canvas/src/components/SceneLayer/CardNodeView.tsx:106`) and the sidecar already writes one; the
`{type}` wrapper is created by `promoteCards` (`studio/studio.ts:353`) and can simply stop being created.

Behind that sits the larger decision, which settles what the scene DSL is for. Two jobs were wearing one name:

| Job                                    | Form             | Why                                                                              |
| -------------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| Serialize a concrete, laid-out drawing | records, as JSON | No second model, so no isomorphism to prove and no translation to lose things in |
| Author intent                          | the semantic DSL | `node`, `edge`, `group`, relations; the engine places. JSON has no form for this |

The measurement that decides the first row is size, over three slides: the DSL is 3.0–3.6 KB and 85–121 lines,
the records are 19–22 KB and 1,000–1,200 lines pretty-printed, 11–13 KB compact. The DSL is 3–6× smaller, which
is real — and it is bought with a hand-written print/parse pair whose agreement has to be re-proved by a
conformance test. Stages 1 and 2 ARE that proof, and all four of their fixes were translation losses.

One thing not to overclaim: those losses came from there being **two object models**, not from the text being
text. They happened at the records↔scene boundary in `SceneHandler`, which exists because `Scene.Scene` /
`Shape.Element` and the `ContentMap` records are different shapes. Serializing the store itself removes that
boundary; serializing `Scene.Scene` as JSON instead of as DSL would have bought nothing.

### What an agent writes well

The agent is a primary author, so this is a design input rather than a footnote. Ranked by observed reliability:

1. **A whole object against a schema** — the Effect Schemas already exist, so constrained decoding makes the
   output mechanically valid. No equivalent exists for a lezer grammar.
2. **Line-oriented text, edited by exact string replacement** — the coding loop. One element per line suits it;
   a 1,000-line nested blob is its worst case.
3. **A JSON Patch** — clearly the weakest. Paths go subtly wrong and the failure is quiet. If a drawing is
   written as JSON it should be whole-object writes, never patches.

What an agent cannot do well is layout arithmetic. It can write `node Store "ProcessStore" below PM` from
understanding; it cannot write `rect box 1312,-417 304x64` from understanding. That is the whole argument for
keeping the semantic layer, and the reason the studio deck — a laid-out drawing carrying absolute coordinates —
sat in the wrong layer and needed `kind=`, `via`, a `data-` escape and a JSON sidecar to survive at all.

## Terms

| Term               | What it is                                            | In the code today                                                         |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| **element**        | a primitive: rect, ellipse, line, text, arrow, portal | `Shape.Element`; `Node` / `Link` when rendered                            |
| **object** (group) | an origin plus elements, nestable                     | DSL `object A @ x,y { … }`; a scene with `kind: 'composite'`              |
| **component**      | an object named or placed again, used as a prototype  | the same composite, promoted out of `anonymous` into the Objects library  |
| **custom element** | a plugin's own primitive                              | a contributed kind with no template                                       |
| **generator**      | a program that emits geometry                         | `Generator`: one TypeScript module, JSON-schema `params`, run in a worker |

Two clarifications that matter:

- A component is **not a clone**. Placements hold `composite: ViewId`, a reference; editing the definition
  reaches every placement, which is the stated purpose. Variance comes from `overrides` and `bind=` fields,
  reflow from `constrain`. `ungroupInstance` and make-unique break the link explicitly.
- Group and component are **one mechanism**, separated by `anonymous`: the Group command makes an anonymous
  composite; naming it or placing it again promotes it into the library. A user never chooses up front.

## Kinds split three ways

`kind` currently blurs two unrelated things. Measured over the studio's six views:

| Kind          | SVG primitives | Repeats | Really is                         |
| ------------- | -------------- | ------- | --------------------------------- |
| `card`        | 0              | 0       | composite template                |
| `chip`        | 0              | 1       | composite template                |
| `feed-card`   | 0              | 1       | template, if templates can repeat |
| `plank`       | 1              | 10      | template, if templates can repeat |
| `app-frame`   | 4              | 7       | template, if templates can repeat |
| `substrate`   | 7              | 11      | generated                         |
| `space-graph` | —              | —       | generated                         |

Zero SVG primitives in `card` and `chip`: they never needed a custom element. They are hand-painted React
doing a template's job, which is how `card` acquired a clipped-corner bug and a `tone` field its schema did
not constrain.

The dividing line is not painting. It is **structure known when authoring versus computed from data**:

1. fixed structure → composite template;
2. data-driven repetition → needs a `repeat` in the template language, or a generator;
3. computed geometry → generator.

So plugin extensibility is three surfaces, not one:

1. **Custom components** (composite templates) — declarative, serializable, DSL-expressible, degrade to their
   parts. The default. `card` and `chip` belong here.
2. **Generators** — already exist, already serializable, already have a worker and an agent-facing skill.
3. **Custom elements** — genuinely new primitives. Rare and justified: each is a hole in the DSL, unwritable,
   uncrossable between dialects, degrading to nothing better than a box.

If templates gain repetition, the studio deck needs **zero** custom elements and becomes fully expressible.

## Containers

A container is **a group whose child positions come from a rule instead of being stored**. Not a new category:
a group either stores positions (free) or holds a layout rule (managed). `constrain` answers "how does a part
react to its frame"; the rule answers "where do children go inside it". They compose, and nesting is a group
whose children are groups.

This already exists four times, which is the argument for naming it once:

1. the deck's sidecar runs — `{ id: 'services', kind: 'down', x, y, w, h, n: 10, gap: 14 }`;
2. `layoutRuns` in `studio.ts`, re-deriving one size and one pitch per run;
3. `SlideSpec` groups and columns, with `layoutSlide` computing every box;
4. the semantic DSL — `right-of`, `below`, `same-row`, `@cell(c,r)`, `compact`, `max-width`.

Three bake coordinates; only the semantic engine keeps intent.

### Decision: the rule is authoritative, geometry is a cached projection

The model holds the rule **and** the resulting geometry. The rule wins. This gives agents editable intent,
gives foreign dialects something to draw, and makes a whole class of bug structurally impossible.

Evidence for that last claim: the plank height `230.66666666666666` was a baked-layout artifact. The deck's
exporter computed `(772 − 2×40)/3` and wrote the quotient as a float; the intent — _three planks evenly in
772_ — was gone, and every consumer inherited a fractional coordinate. It was patched by snapping the output,
which treats the symptom. With the rule in the model the renderer divides and snaps at draw time and the
number never exists.

### Decision: dragging a child of a managed group reflows

A drag reorders within the rule; position stays derived. A child may be **pinned** explicitly, taking a stored
position while its siblings stay managed. Pinning is visible in the DSL rather than implied by a stale
coordinate, which keeps the rule meaningful by default.

## Effect on existing drawings

The change is additive: rules and component references are new fields beside geometry that is already stored.

| What                     | Count     | Effect                                                                                                        |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------- |
| Semantic `.dx` sources   | 53        | **None.** They already carry intent (`node`, `edge`, `group`, relations) and are the proof the approach works |
| Scene `.diagram` sources | 9         | Keep parsing. Absolute coordinates, so no rules until re-authored                                             |
| Mermaid corpus           | 6         | None; the layout engine's eval set                                                                            |
| Stored canvases (ECHO)   | per space | Keep rendering. Geometry is present, rules absent                                                             |

No data rewrite is required. The versioning machinery already exists and should carry it:

- `SCENE_REVISION` (now 2) with `SCENE_SCHEMA = dxos.org/scene/${SCENE_REVISION}`;
- `SceneMigrations` with `sceneV1ToV2` as the worked example;
- `isNewerScene`, which opens a canvas written by a newer plugin read-only rather than dropping fields.

Two risks to carry into implementation:

1. **A copy is a fork.** A tool's template is copied into the drawing on first placement ("a tool's first shape
   brings its template into the drawing"). Upgrade the plugin and existing drawings keep the old definition,
   with no version on the copy and no re-sync path. Versioned component references would fix this and should be
   decided before components multiply.
2. **Opaque kinds cannot degrade.** Until `substrate` and `space-graph` are generators or templates, a document
   using them is unwritable as text, and the read-only fallback is a titled box.

## Decisions taken

### A document renders without its plugins, degraded

Some components simply are not visible. So the model must distinguish two failures: a component whose
definition it cannot resolve but whose parts it can still draw, and a primitive it cannot paint at all. That
argues for a data-rich model carrying both the reference and the fallback structure.

### Templates get `repeat`

A template can repeat a part over a bound array. `feed-card`, `plank` and `app-frame` therefore become
templates, and the studio deck needs **zero** custom elements — which is what makes it fully expressible as
text. `substrate` and `space-graph` stay generators.

### Records are the store; the DSL and the records are isomorphic; the DSL is the authoring truth

Three things that are easy to conflate:

|                      | What it is                          | Decision                               |
| -------------------- | ----------------------------------- | -------------------------------------- |
| storage format       | what is persisted and merged        | **records**, in ECHO/Automerge         |
| serialization format | what is written to a file or a wire | either; a `.dx` file is a faithful one |
| source of truth      | which wins when they disagree       | **the DSL**, for authoring             |

Records stay the store for two concrete reasons, not deference to the status quo:

1. **Merge granularity.** Records merge per element, so two people moving different boxes both succeed.
   Text storage merges text, where two edits to adjacent lines conflict and reformatting conflicts with
   everything.
2. **Undo is path-based.** `canvas.apply` returns Automerge heads plus the leaf paths written
   (`[layoutKey, 'elements', id, 'center', 'x']`), and `applyPatch` undoes by moving exactly those paths.

The property to enforce is the achievable one, not a claimed bijection:

- **model → text → model is identity**, and
- **text → model → text is stable** after one normalization pass.

Comments, formatting and statement order normalize on the first write. Since agents are a primary author,
the model should carry comments rather than drop them (today they "parse and are dropped, as documented").

### `Scene` is export-only

`Scene.Scene` is the interchange form — SVG export, mermaid import, the `dx-payload` in every `.dx.svg` — and
it is lossy against the records (41 records to 16 objects, every kind flattened to `rect`). That is harmless
one way. Anything arriving through it must create a NEW drawing or be an explicit lowering, never a round
trip over an existing one. **The DSL is the only text that may author a drawing; `Scene` is a picture of one.**

### Two authoring paths, four obligations

Agents and humans write DSL (whole document, carrying intent); humans edit the diagram (one element, carrying
result). For both to write one model:

1. **Stable identity** — printing produces the same ids every time, or a drag lands on a different element than
   the one that was moved. This is the `dsl: { object, element }` marker, whose absence made the editor print
   an empty document.
2. **Applying DSL is a diff, not a replacement** — the paths differ in granularity. Replacing wholesale is how
   `Rebuild` reported "20 drawn, 21 removed" and emptied a drawing.
3. **Intent survives direct manipulation** — a drag on a managed child reflows, or pins; the pin is written into
   the DSL, or the next rewrite derives it away.
4. **Losslessness is a property** — enforced by a bidirectional conformance test, not by inspection.

## Open questions

1. How a component reference is versioned, so a drawing can re-sync with an upgraded template instead of
   forking it silently on first placement.
2. Whether the DSL carries a version marker. It does not today, which is why fractions parse but do not print:
   emitting one would produce text an older parser rejects with no way to negotiate.

## Changelog

- 2026-11-17 — user: no value grammar for the scene DSL. The scene DSL is not a round-trip format: a concrete
  drawing is stored as records, and the semantic DSL is what agents and humans author. The fields that would have
  needed a value grammar move onto composite templates and generators instead.

- 2026-11-17 — agent: stage 2 implemented. A link keeps its markers, line style and colour through the DSL, an
  arrow states its own bends (`via`), and a kind field colliding with an element attribute is escaped rather than
  dropped. The corpus test compares each kind's own fields, each link's markers and each route point for point,
  over all nine slides. Remaining: lists and nested objects, measured above and left for a decision.

- 2026-11-17 — agent: stage 1 implemented. `Shape.Box` gained optional `type` and `data`; the DSL spells them
  `kind=<name>` plus the kind's own scalar attributes, with the element table's names reserved; `SceneHandler`
  maps both ways. Conformance is a test, not an inspection: one unit test for a card and one over all nine
  slides, which fails on every slide with the mapping removed.

- 2026-11-17 — agent: wrote up the model after the studio deck exercised every seam. Decisions taken:
  containers are a group property; the layout rule is authoritative with geometry cached; a managed child
  reflows on drag and may be pinned; plugin extensibility is three surfaces, with custom elements the rare one.
- 2026-11-17 — user: a document renders without its plugins in degraded form, some components simply not
  visible; templates get `repeat`; records remain the store with the DSL as the authoring truth and the two
  isomorphic over content; `Scene` is export-only.
