# @dxos/diagram

## 0.13.0

### Minor Changes

- 5a27d5c: Decisions can carry images for models that read them. `DecisionModel.decide(definition, { input, images })` reaches Clef and Clef Flash as embedded data URLs on the System One `images` extension; jev, which reads no images, fails such a call with `InvalidUserInputError` rather than answer blind. `TypeSafeResolver.makeDecisionModel` takes `images: true` to opt a back-end in, and the resolver sets it from a model's `image` characteristic. Effect's `DecisionModel` gains `images` through a local patch until the upstream change lands.

  `@dxos/diagram` gains a rule library of what makes a diagram read well (`rules/DIAGRAM.mdl`, parsed by `Rules`), scored by `Appeal`: rules measurable from geometry are scored in code, and the rest are asked of a judge shown the rendered page (`Architecture.judge` and `Aesthetics.judge` accept a subject with `images`). `Appeal.objective()` lets the layout engine choose by appeal. `DxSvg` embeds a JSON payload in an SVG's `<metadata>`, so a drawing exported as `.dx.svg` opens as an image anywhere and imports back as editable objects.

  The mermaid layout engine draws tidier diagrams: ports along each box side follow the order their connectors turn away (`Ports`), parallel runs that share a line are nudged apart (`Nudge`), and placements are compacted toward the boxes they connect. On the illustrator's corpus, crossings fall from 56 to 23 and no connectors overlap; compiling takes longer because each candidate is re-routed.

- 234ef9c: `MermaidEngine` lays out diagrams several times faster: the edge router's search uses typed arrays and an arrival-aware turn estimate, and candidates whose inheritance bus would draw nothing are no longer routed twice. Routes keep their optimal cost, though ties between equal-cost routes can now resolve differently. A new `emitCandidate` option, with `emitJob`, lets a caller route candidates on worker threads.
- 014996b: Edge labels sit beside their own route and off group frame borders. The semantic DSL gains soft sides (`A:~left`), group shape (`compact`, `max-width=N`, `diagram aspect=W:H`) and fan-in buses (`edge A, B -> C bus`), and warns about a bus it cannot honour or a group frame an outside relation stretches. Diagnostics measure bound arrows as drawn, count a bus as one connector, and no longer count T-junctions or self-loops as crossings. Node labels wrap, shrink or ellipsize to stay inside their box, and re-rendering a source gives a byte-identical `.dx.svg`.
- 22adb53: When several connectors share one side of a box, the most significant relationship takes the centre of that side: inheritance and implementation first, then composition, then aggregation and the one-to-many and many-to-many relations, then plain associations, then dependencies. `Semantic.significance` exposes the ranking.
- 2550779: The diagram DSL gains a semantic layer: `diagram`, `group`, `node` and `edge` statements describe what is related and roughly where, and `Dsl.compile` places and routes the rest. Constraints range from loose to exact — `right-of`, `above`, `same-row` (soft with `~`), grid cells, absolute positions, port sides, `via` waypoints and shared `bus` channels — so a model can write a good-looking diagram directly, without a helper script.

  Edges name UML and ER relationships — `extends`, `implements`, `composes`, `owns`, `depends-on`, `one-to-many`, `many-to-many` — and the renderer draws their line endings (hollow triangle, filled and hollow diamond, crow's foot, dashed lines). Children that extend or implement the same parent sit on one row and meet it through a single trunk and triangle. Mermaid class and ER diagrams carry the same relations through. The illustrator's Constraints story shows each diagram beside its DSL and scores.

  The illustrator's `render-diagrams` task renders `.dx` sources as well as mermaid, writes a PNG beside each file it is given, and runs from source again.

### Patch Changes

- Updated dependencies [cb1e218]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
  - @dxos/util@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/invariant@0.13.0

## 0.12.0

### Minor Changes

- 119f317: Extract the renderer-neutral scene DSL, dialects, layout engines, diagnostics and SVG content handler from `@dxos/plugin-illustrator/model` into the new `@dxos/diagram` package; the plugin's `model` entry now exports only the ECHO-bound builders (`makeBuilder`, `SvgBuilder`). The DSL gains arrow endpoint ports (`from`/`to` accept `object/element#port`, with `Scene.parseRef` / `Scene.resolveRef`), a `portal` element referencing a nested drawing, and an optional fractional `index` on world objects for z-order.

  Add the scene engine (`@dxos/react-ui-canvas/scene`): an infinite, zoomable canvas of typed nodes (rectangle, ellipse, UML class, text, portal) and links (line, curve, spline) at multiple depths, with drill-in through portals, a projection seam for freehand, constrained and graph-driven layouts, in-place text editing, node styles, undo/redo, cut/copy/paste and a schema-driven properties panel. The private `@dxos/plugin-canvas` contributes it to the illustrator as the `dxos.org/scene/1` drawing variant.

- 18758f9: A text DSL for the scene language, so a diagram can be reviewed, hand-edited and blamed like code rather than exchanged only as JSON.

  `Dsl.parse` reads a document into `Scene.Command[]` — reporting located problems instead of throwing, so an editor keeps rendering the last good shapes while a line is half-typed — and `Dsl.print` writes a scene back in a canonical form that round-trips. The grammar is Lezer (`src/dsl/diagram.grammar`, generated by a `prebuild-lezer` task) and covers everything `scene.ts` can express, including the two a line-based syntax usually loses: arrow ends bound to an element (`A/box#left -> B/box`, which track their target when it moves) and `portal` windows onto another drawing. `Scene.BoxKind` and `Scene.Corners` are now named literals so the DSL reads its vocabulary off the schema.

  `Dsl.convert` turns a mermaid flowchart or classDiagram into DSL text by running the existing dialect and printing its commands, so every source language the registry gains converts for free; `moon run diagram:convert -- <file>` exposes it. The output is the post-layout form — the DSL has no unpositioned node — which is the point: generate a layout once, then keep it as something you can tune and check in.

  `@dxos/diagram/extension` adds the CodeMirror mode: highlighting off the parse tree, completion over the schema's own attribute tables, and a linter reporting both parse problems and the `Diagnostics` layout report against the statement that caused it. A ```diagram fenced block is a sibling of MDL's grammar dispatched by the fence, not a nesting inside it; `docs/DSL.md` has the reasoning.

  `plugin-illustrator` gains a `Draw` operation taking DSL source, beside `Generate` which keeps owning layout. It returns parse `problems` with line and column alongside the layout `diagnostics`, so an agent can fix its own syntax and its own overlaps. The UML skill documents the syntax and when to prefer it over generation.

- ca04eca: Diagrams can now be graded on one 0–1 scale: `Score` turns layout constraints and costs (including new overlapping-text and overlapping-arrow diagnostics) into scores, `Architecture` and `Aesthetics` judge content and drawn layout against written rules in one `DecisionModel` call, and `View` renders a layout as text for judges that cannot read images. Flowcharts gain UML relation kinds drawn with the existing markers and a translucent `tint` fill for group frames, and the illustrator adds a Score operation and a live Scores companion so an assistant can score and redraw a drawing.

### Patch Changes

- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [fd23a8b]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [9d2466a]
- Updated dependencies [b1bb838]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [6dadb41]
  - @dxos/effect@0.12.0
  - @dxos/util@0.12.0
  - @dxos/invariant@0.12.0
