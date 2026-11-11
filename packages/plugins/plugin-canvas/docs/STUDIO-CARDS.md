# Studio deck slides as canvas drawings

A spike: the three graph slides of the studio deck's Ontology page (`dxos/studio`, branch `substrate-package`,
`assets/deck/canvas`) rebuilt as `plugin-canvas` drawings, with a `card` element kind contributed the way a plugin
contributes one. Nothing in `plugin-canvas` itself changed.

| Where                                                  | What                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/testing/studio/*.diagram`                         | The three slides in the scene DSL, as studio exported them (one fix, below). |
| `src/testing/studio/*.json`                            | The sidecar: everything the DSL has no word for.                             |
| `src/testing/studio/studio.ts`                         | The loader — parse, apply, then repair from the sidecar.                     |
| `src/testing/studio/studio.test.ts`                    | What the loader had to repair, as assertions.                                |
| `src/containers/CanvasArticle/StudioCards.stories.tsx` | The `card` kind and a story per slide.                                       |

Stories: [Ontology](http://localhost:9009/?path=/story/plugins-plugin-canvas-containers-studiocards--ontology),
[Chat](http://localhost:9009/?path=/story/plugins-plugin-canvas-containers-studiocards--chat),
[Agent](http://localhost:9009/?path=/story/plugins-plugin-canvas-containers-studiocards--agent),
[WithoutPlugin](http://localhost:9009/?path=/story/plugins-plugin-canvas-containers-studiocards--without-plugin).

## 1. Parsing

`chat.diagram` and `agent.diagram` parse clean as exported. `ontology.diagram` reported four errors, all one bug:

```diagram
arrow group-organization "group"/box -> organization/box "part of" head=triangle
```

The exporter quotes the **object segment** of a ref, because `group` collides with the semantic `group` keyword and
its id printer quotes reserved words. A ref is one token: the grammar's `Ref` is `name | String`, and
`Dsl.print`'s `formatRef` quotes the whole ref or none of it. Both of these parse; neither quotes a segment:

```diagram
arrow group-organization group/box -> organization/box "part of" head=triangle
arrow group-organization "group/box" -> organization/box "part of" head=triangle
```

`group/box` is not itself reserved, so the canonical print is the bare form. With that one change all three files
parse with no problems and round-trip stably: `parse → print → parse` gives the same scene and the same text.

**The studio-side fix** is in `assets/deck/lib/dsl.mjs`, which builds an arrow end as `` `${id(a)}/box` ``. The ref
needs its own helper that applies the bare-or-quoted test to the finished ref rather than to the id inside it:

```js
const ref = (s) => (BARE_REF.test(`${s}/box`) ? `${s}/box` : JSON.stringify(`${s}/box`));
```

Two smaller things in the same file: it over-quotes `note`, `fragment` and `else` (upstream treats those as
contextual keywords, so ids may use them unquoted), and it never emits `fill=none` on a frame, which is why the
layer frames come out as filled grey boxes rather than the deck's unfilled regions. Both are one-liners.

## 2. Loading a slide

The route is the illustrator bridge, not a bespoke importer:

```ts
const { commands } = Dsl.parse(source);
applyCommands(content, commands, SceneHandler);
```

`SceneHandler` turns each DSL element into a canvas record: a `rect` into a `rect` node, an `arrow` into a `smart`
link whose two ends are bound to their nodes, a `text` into a note (or, at `weight=s`, a small left-aligned label
— and, when that label sits inside a box of the same object, into that box's heading instead). Everything
geometric survives: positions, sizes, frame styling, arrow heads, dashed strokes and captions.

What does not survive is what the DSL could not carry in the first place. The loader repairs it from the sidecar,
and that repair list is the finding:

| Repaired                           | From the sidecar            | Why the DSL could not say it                                                                                                  |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A card's icon and tone             | `nodes[key].icon`, `.tone`  | There is no custom node kind in the DSL, so the exporter wrote them as a trailing comment, and comments are dropped on parse. |
| A connector's waypoints and elbows | `edges[n][3].via`, `.elbow` | A DSL arrow is two ends and nothing between them.                                                                             |
| A heading's or caption's size      | `texts[n].role`             | The DSL's only text-style lever is `weight=s`.                                                                                |
| A layer label's placement          | `frames[n].label`           | See below — the DSL can place it, but not say what it belongs to.                                                             |

Two traps worth writing down, both found the hard way:

- **A stored route must start and end on the nodes' outlines.** `diagramRoute` keeps `connector.route` only when
  its first and last points are within `ROUTE_SLACK` of the two frames; otherwise it silently discards the route and
  re-routes the connector orthogonally. The sidecar holds waypoints only, so the loader computes an attachment
  point on each frame and brackets the waypoints with them.
- **A routed link takes its stroke from the connector, not from the link's `style`.** A dashed link goes solid the
  moment you give it a route, unless `connector.stroke` is set too.

And one that cost the most time: the canvas content map is `Record<string, any>`, so a record that fails its schema
is not rejected — `readViews` simply skips it and the element vanishes with no error. An `alignVertical: 'center'`
(the literal is `middle`) made eight text nodes disappear. `studio.test.ts` asserts the total node count for exactly
this reason.

## 3. The `card` kind

`CanvasCapabilities.NodeType` took the kind with no change to `plugin-canvas`:

```ts
const cardSpec: ElementKindSpec = {
  name: 'Card',
  icon: 'ph--cards--regular',
  schema: Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('card'), ...cardFields }),
  component: CardNodeView,
  create: ({ id, z, center, size }) => ({ type: 'card', id, z, center, size, label: 'Card' }),
  defaultSize: { width: 236, height: 66 },
  parts: [{ field: 'label' }],
};
```

The kind's own fields (`icon`, `tone`) sit at the element's top, over `Scene.Element2D`; `kindNodeDef` moves them
down to `props.canvas` for the engine and lifts them back out of every intent the viewport writes, so a card can be
moved and relabelled on the canvas and keep its icon. `label` is the shared slot, which is why the `WithoutPlugin`
story still reads: with no contribution the card falls back to the core base, a box showing its title.

Naming note: the card's accent is `tone` at the element's top level, which is **not** `style.tone` (a hue's fill
level, `NodeTone`). They do not collide — `style` is one slot and the kind's fields are another — but the two
meanings of the word are a trap.

## 4. How close it looks

Close enough to read as the same slide. What still differs from the PNGs:

1. **Frames draw filled.** `color=grey` maps to a filled neutral box; the deck's layer region is an unfilled inset.
   `fill=none` in the DSL fixes it, and belongs in the exporter.
2. **Headings anchor at their `x`.** The deck centres a column heading over its column; the DSL text carries a
   position, not an alignment, and the sidecar's `role` says nothing about it either.
3. **Case and letter-spacing are lost.** The deck uppercases and tracks its mono labels in CSS; `NodeStyle` has
   `fontFamily`, `fontSize` and the two alignments, and no text transform.
4. **The card is approximated.** The view draws the deck's shadow inline rather than from a theme token, so it is
   the right shape rather than the same shape.

## 5. The gaps

**Can an arrow carry waypoints while staying bound to its nodes?** In the canvas, yes, and the Agent story shows it:
five connectors route around the right-hand column and down the left, and their ends stay `{ node }` endpoints that
follow the cards. `Link.connector.route` is the field; `SplineLink.points` is a second way to say it. In the DSL,
no: `arrow <end> -> <end>` has exactly two operands, so the deck's routes survived the export only as
`# route=via …` comments that the parser drops. This is a DSL gap, not a canvas one — the cheaper of the two to
close.

**Can a frame carry a label?** Yes: `rect frame 0,0 1072x221 "UI / Control"` parses and the label reaches the node.
But a box's label is drawn **centred inside** it, over whatever the frame contains, which is wrong for a layer
name. The DSL can place the text where the deck wants it — a separate `text … weight=s` object beside the frame —
and that is what the loader synthesizes. What it cannot say is that the text _belongs to_ the frame: `SceneHandler`
pairs a title with a box only when the text is contained **within** that box (`titleOf` → `contains`). So a frame
heading inside its bounds is expressible today; one beside the frame is two unrelated elements.

**What would the DSL need to express icon and tone on a node?** Not new syntax. The grammar already accepts any
`name=value` and leaves rejection to the linter, so `rect box 0,0 236x66 "Group" icon=users-three tone=blue` parses
today and fails lint as two unknown attributes. What is missing is a way for a contributed kind to declare its
attributes, so the linter and the printer learn them from the same `ElementKindSpec` the canvas learns the view
from. Two smaller pieces follow: the element word (`rect`) is a fixed vocabulary, so a card is a `rect` that a
sidecar reinterprets rather than a `card`; and `tone=#2d6fff` is not expressible, since `color=` takes the schema's
named literals only.

## 6. Recommended next step

In order of value for the cost:

1. **Fix the studio exporter** — the ref helper above, plus `fill=none` on frames. One commit in `dxos/studio`,
   and the exported files are valid and closer to the deck.
2. **Give the DSL a waypoint clause on `arrow`** — `arrow a/box -> b/box via 1508,301 1508,829` reuses the `via`
   keyword the semantic layer already reserves, and maps straight onto `connector.route`. This alone makes the
   Agent slide expressible without a sidecar.
3. **Let an `ElementKindSpec` declare DSL attributes**, so a contributed kind is a first-class element word rather
   than a `rect` with a sidecar. Until then, a slide needs both files and a loader.

Items 2 and 3 are what the sidecar exists to work around. With them, `*.json` disappears and a slide is one file.

## 7. Todo: a presentation template for a drawing

A drawing has no notion of the box it will be shown in. It has a scene and a camera, and the viewport fits the
content to whatever space it is given, so a diagram authored to fill a screen and one authored for the right-hand
column of a two-column slide are the same drawing with a different zoom. That is wrong for a deck: the slide
decides the shape, and the diagram should be composed for it.

What already exists, in both plugins:

| Where                                                                    | What it fixes                                                                                                               |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `plugin-presenter/src/components/Slide/canvas.tsx` → `createLayoutProps` | The full-screen stage: 16:9, nominal 2560 × 1440, scaled to fit and centred.                                                |
| `plugin-presenter/src/markdown/frontmatter.ts` → `LAYOUTS`               | 18 layouts (a Slidev subset): `full`, `default`, `two-cols`, `two-cols-header`, `three-cols`, `two-by-two`, `image-left`, … |
| `plugin-presenter/src/markdown/slots.ts` → `LAYOUT_SLOTS`                | The named regions of the multi-slot layouts.                                                                                |
| `plugin-presenter/src/components/MarkdownSlide/layouts.tsx`              | Those layouts as CSS grid inside the stage, with `theme.padding` (`px-40 py-16`) around the content.                        |
| `plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx`           | Already special-cases `AppSurface.Slide.role`, and falls back to `aspect-video` for a section its host does not size.       |

So the stage is 16:9 at 2560 × 1440, and the default content box inside it is 2240 × 1312 (≈ 1.71:1) once the
padding is taken off — but both of those are implicit, one in a component's local constant and the other in a
Tailwind class. Nothing a drawing can read, and nothing the two plugins agree on by construction. The deck we are
copying has the same idea written down a third time: 1600 × 900, in `studio/assets/deck/lib/deck.css`.

**What to build.** A declared _stage_: a nominal size, its aspect, and the content box each layout slot offers,
all in nominal units. A drawing carries the stage and slot it was composed for; the canvas uses it as the
authoring frame (a visible boundary, and the extent an export crops to) rather than fitting to content; the
presenter uses it to place the drawing without re-measuring. Three cases to cover, which is the set to design
against: a full-bleed diagram, a diagram under a title in the content area, and a diagram in one column of a
two-column slide.

**Where it lives.** `plugin-canvas` already depends on `plugin-presenter`, not the reverse, so the shared
definition has to sit below both. Two candidates:

1. **`@dxos/scene`** — already the renderer-neutral schema layer under `react-ui-canvas` and `plugin-canvas`, and
   a stage is a schema. Costs `plugin-presenter` a new dependency on it.
2. **A new small common package** (`@dxos/stage`) holding nothing but the stage and layout geometry, which both
   plugins and the deck's own exporter can read.

(1) is cheaper and keeps the count down; (2) is cleaner if the geometry grows to cover print and image export as
well. Either way the presenter's `createLayoutProps` and the markdown layouts' padding should be derived from it
rather than restated.

## 8. Todo: spike the richer deck slides

The three slides done here are the deck's _simplest_: a graph of uniform cards, straight or orthogonal links, and
a few frames. The six numbered slides are a step up, and each stresses something the card kind does not reach:

| Slide             | What is new                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `02-echo-layers`  | Cards with a body and a footer, and a grid of chips _inside_ the card — a kind with nested content, not one label. |
| `03-plugins`      | One card fanning out to five, `wire`/`path` connectors with their own labels, and consumer chips sharing a width.  |
| `05-architecture` | Two mirrored stacks, one shared service grid in a fixed order, groups with labels, wires with labels.              |
| `06-agents`       | Feed strips, and a _generated_ hex-lattice space graph drawn inside the slide (`substrate-view.mjs`).              |
| `01-hyperspace`   | Wireframe Composer planks and the substrate view — an embedded UI, which on the canvas is a portal.                |
| `04-composer`     | The Composer app frame with region ids — the same, with a layout of its own.                                       |

**The studio half is the bigger half.** Only `erd`, `chat` and `agent` export a `model()`; the six numbered slides
render straight to HTML with no data model, and `export.mjs` only walks those three. There are no reference PNGs
for them either. So the next spike starts in `dxos/studio`: give the chosen slides a `model()`, teach `dsl.mjs`
the elements they use, and capture a PNG of each — and only then build the kinds on this side.

**Suggested order:** `03-plugins` and `05-architecture` first. They need no generated graph and no embedded UI, so
they exercise exactly the two things the card kind is missing — a card with body/footer/chips, and a labelled
connector that is not a plain arrow — and they would tell us whether the sidecar can be retired or has to grow.
`06-agents` next, since a generated sub-graph is what canvas Generators are for. `01-hyperspace` and `04-composer`
last: a portal onto another drawing is a different question from a diagram.
