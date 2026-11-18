# Exporting a deck slide for plugin-canvas

What the studio side has to produce for a slide to be rebuilt as a canvas drawing, written after two rounds of doing
it by hand ([STUDIO-CARDS.md](./STUDIO-CARDS.md) has the findings). It is the brief for the session that prepares the
five remaining slides; nothing here is speculative — every rule came from a file that failed to parse, an element
that drew wrong, or a field the loader had to invent.

Slides done: **Ontology**, **Chat**, **Agent** (round 1, plain cards), **Agents** (round 2, feed cards and a
generated space graph).

Slides to do, in the order they get cheaper:

| Slide                      | New to it                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `03-plugins`               | One card fanning out to five; `wire`/`path` connectors with their own labels; consumer chips of a shared width. |
| `05-architecture`          | Two mirrored stacks; one shared service grid in a fixed order; groups with labels; labelled wires.              |
| `02-echo-layers`           | Cards with a body **and** a chip grid inside them — a card whose content is a list, not a line.                 |
| `06-agents` (deck slide 6) | Already exported as `agents` in round 2; nothing further unless the slide changes.                              |
| `01-hyperspace`            | Wireframe Composer planks, and the packed substrate view (many space graphs at once).                           |
| `04-composer`              | The Composer app frame with region ids.                                                                         |

`01` and `04` embed a UI rather than a diagram, so leave them last: on the canvas they are a portal onto another
drawing, which is a different question from anything below.

## 0. Before anything else

Only `erd`, `chat`, `agent` and `06-agents` export a `model()`. The other slides render straight to HTML, and
`export.mjs` walks only the ones that have one. **The first job for each slide is to give it a `model()` that its own
`render()` then draws**, so the two cannot drift — that is what `06-agents` does, and why its export matched its
PNG. A model written beside `render()` rather than derived from it will be wrong within a week.

Also produce the `.png` at 1600 × 900 in the light theme. It is the only reference the canvas side has.

## 1. The DSL file

Three bugs found in `lib/dsl.mjs`, all still unfixed upstream:

1. **A ref is quoted whole or not at all.** The printer builds an arrow end as `` `${id(a)}/box` ``, which quoted the
   object segment when the id collided with a keyword and produced `"group"/box` — four parse errors on
   `ontology.diagram`. The grammar's `Ref` is `name | String`; a quoted _segment_ is not a ref. Add a helper beside
   `id()` that applies the bare-or-quoted test to the finished ref:
   ```js
   const ref = (s) => (BARE_REF.test(`${s}/box`) ? `${s}/box` : JSON.stringify(`${s}/box`));
   ```
2. **`note`, `fragment` and `else` are over-quoted.** They are contextual keywords upstream (`SEQUENCE_KEYWORDS`,
   deliberately not in `RESERVED`), so ids may use them bare. Drop them from `KEYWORDS`.
3. **Frames need `fill=none`.** `color=grey stroke=dashed` alone makes the canvas draw a filled neutral box. On the
   Agents slide that box painted over the whole space graph inside it. `fill=none` is valid DSL and says what the
   deck means by a layer region.

Everything else parsed. `agents.diagram` — an `ellipse`, arrows with no `head=`, and arrows ending on `space/ring` —
went through with no problems and round-tripped stably, so the `component=` convention in the README is sound.

## 2. The sidecar

The `.json` is not a convenience: it is every field the DSL has no word for, and the loader reads it for each one.
Keep writing it, and keep these shapes, which the canvas side now decodes with a schema (a drifted export fails
loudly rather than drawing half a slide).

```jsonc
{
  "id": "agents", "title": "…", "subtitle": "…",      // title/subtitle: the presenter's heading, NOT the drawing
  "size": { "w": 1600, "h": 900 },
  "nodes": {
    "triage": {
      "cx": 600, "cy": 336, "w": 300, "h": 176,        // centre and size in slide units
      "kind": "feed-card",                             // the element kind; absent means the plain card
      "icon": "robot", "title": "Triage agent", "tone": "ink",
      "feed": { "n": 9, "label": "feed", "marks": { "5": "accent", "6": "accent" } },
      "body": "…", "footer": "…"
    }
  },
  "edges": [["triage", "research", "", { "route": "curve-h", "dash": true, "color": "accent" }]],
  "frames": [{ "id": "subagents", "x": 778, "y": 160, "w": 336, "h": 648, "label": "Sub-agents · child feeds" }],
  "texts":  [{ "id": "l-space", "x": 1142, "y": 702, "w": 392, "text": "…", "role": "label", "align": "center" }],
  "components": [{ "id": "space", "kind": "space-graph", "cx": 1338, "cy": 488, "r": 196, "params": {…}, "lit": {…} }]
}
```

Rules that cost time when they were missing:

- **`w` on every text, and `align` where it is not left.** Without a width the loader guesses from the character
  count, and a heading the deck centres over a column ends up anchored at its left edge.
- **`role` on every text**, from `heading | caption | label | link-label | note`. It is the only thing that gives a
  text a size — the DSL's one lever is `weight=s`, which is a single size.
- **`w`/`h` on every node**, even where they are the slide's default. The loader sizes the element from them.
- **A `link-label`'s `for`** names the links it captions, so the loader can place it on a route rather than at a
  fixed point.
- **Marks are string keys** (`"5"`), because JSON object keys are. Do not switch to an array of indexes.

## 3. New element kinds

A kind is a node type on the canvas (`CanvasCapabilities.NodeType` + an `ElementKindSpec`), written once and
contributed by a plugin. The sidecar names it with `kind` and carries its fields; the DSL draws a `rect box` as a
stand-in, with the fields in the trailing comment.

For the remaining slides, say in the component README **what the fields are** before writing any code, the way
`components/README.md` did for the feed card. The three that are coming:

| Kind                    | Fields                                                                    | Seen on                                           |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `chip` / `chips`        | `icon`, `label`, `note`, `tone`, `ghost`; a grid takes `cols`             | `02-echo-layers`, `03-plugins`, `05-architecture` |
| `card` with a body slot | the plain card plus `body: Chips \| Text`, so a card can hold a chip grid | `02-echo-layers`                                  |
| `wire`                  | not a node: a link with its own label and a named route                   | `03-plugins`, `05-architecture`                   |

A kind keeps its title in `label`, always. That is the shared slot, and it is why a drawing still reads when the
plugin that defines the kind is not loaded.

## 4. Components (generated parts)

The space graph is the pattern: a `Generator` object holding one TypeScript module, placed as a `generator` node
whose frame sets its extent. What the studio side owes a component:

1. **The geometry as a portable module** (`<kind>.generator.ts`), importing only `@dxos/react-ui-canvas/motion`.
2. **A parameter schema** (`params.schema.json`). Put `x-binding: "node"` **on the property**, not on its `items` —
   `bindingsOf` reads the property and never looks inside it, so the draft's `readers` array bound nothing and the
   graph drew with no taps and nothing lit. An array value on a property-level binding is resolved correctly.
3. **A golden file and a check** (`golden-seed7.json`, `check.mjs`). This was the single most valuable thing in the
   round-2 hand-off: the port matched the deck's 169 cells, 101 objects, 126 links and 4 reader picks on the first
   run, and the check became a test on the canvas side. Keep writing it for every component.
4. **The parameters the slide uses**, in `components[n].params`, plus `lit` for objects drawn lit.

Two constraints to design against, both found by running the real API:

- **A generator's shapes cannot be dashed.** `Shape2D` is `circle | rect | path`; a path takes `d`, `width`,
  `opacity`, `reveal` and a colour, and that is all. The deck's dashed reader links draw solid. If a dash matters,
  either draw it as a run of short segments or make the thing a node type instead.
- **A link cannot end inside a node.** The DSL can say it (`arrow reader/box -> space/ring` with `tap=`), but a
  canvas link binds to a node's outline, and the objects of a generated graph are shapes rather than nodes, so there
  is nothing to bind to. The generator therefore draws its own reader links, from the nodes bound to it. A component
  whose inner objects other drawings must link to has to be a **node type**, not a generator.

## 5. What the canvas side does with it

So the studio session knows what its output turns into:

```ts
const { commands } = Dsl.parse(source); // the .diagram, title block dropped
applyCommands(content, commands, SceneHandler); // positions, sizes, frames, links
promoteCards(content, model); // boxes become `card` / `feed-card` elements
styleText(content, model); // sizes and widths from `role`, `w`, `align`
styleFrames(content, model); // unfill, and place the label
routeLinks(content, model); // `route`, `via`, `elbow`, `dash`, `color`
placeGenerators(content, model, generators); // `ellipse ring` becomes a generator node
```

Every line after the first two exists because the DSL could not carry something. The goal across the remaining
slides is to shorten that list, not to grow the sidecar.

## 6. Open: the grid and the lattice

Not settled, and worth settling before the next export: the deck lays slides out on its own implicit grid (1600 × 900
units, cards on 160-unit rows), the canvas has a lattice and a snapping grid of its own, and the space graph has a
hexagonal lattice with a `pitch`. Three grids, none aware of the others. Until there is one answer, the exported
coordinates are absolute and the canvas treats them as free positions, which is why nothing snaps when a card is
moved by hand.
