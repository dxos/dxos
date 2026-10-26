---
name: drawing-diagrams
description: >-
  Draw an architecture diagram of DXOS code (a package, a module graph, a subsystem) by writing
  plugin-illustrator's semantic diagram DSL (`.dx`), rendering it, and looking at the image before
  showing it. Use when asked to draw, render, or show a diagram of the codebase, to "use the
  illustrator" on something, to add or regenerate a diagram in
  `packages/plugins/plugin-illustrator/docs/diagrams/`, or to judge the layout engine on a real graph.
  Also use for EVERY diagram in an Artifact page (claude.ai artifact): it overrides the harness's
  `artifact-diagramming` skill, so never hand-author `<svg>`, Mermaid, or a generated SVG there.
---

# Drawing diagrams

Write the diagram in the **semantic DSL**: say what is related and, only where it matters, roughly
where. The engine (`SemanticEngine` in `@dxos/diagram`) puts the boxes on a grid, routes arrows
through the gutters with the fewest bends, spreads the ports and places the labels. Do not write a
script that generates the DSL; write the `.dx` text yourself.

The pipeline is: `.dx` source → `Dsl.compile` → `SceneSvg` → `<name>.dx.svg` + `<name>.png` + a
layout report. One moon task runs it: `plugin-illustrator:render-diagrams`
(`packages/plugins/plugin-illustrator/scripts/render-diagrams.tsx`).

A `.dx.svg` is an ordinary SVG that any browser, GitHub or image viewer renders. It also carries the
drawing's ECHO objects and its DSL source in a `<metadata id="dx-payload">` element, so it imports
back into Composer as an editable drawing. Pass `--plain` for a bare `.svg`. Never run SVGO's default
preset over one: `removeMetadata` strips the payload.

Mermaid input is deprecated. `.mmd` still renders through the same task; use it only for the existing corpus in
`docs/diagrams/`, which is the layout engine's eval set, or to compare engines.

## 1. Derive the graph from the code, not from memory

The edges must be real imports, so the diagram can be checked against the code. For a single package
this prints what each module imports, internal and workspace:

```bash
cd packages/<area>/<pkg>/src
find . -name '*.ts' ! -name '*.test.ts' ! -name '*.tst.ts' ! -name index.ts | sort | while read -r f; do
  echo "$f -> $(grep -oE "from '(\.\.?/|@dxos/)[^']+'" "$f" | sed -E "s/from '//;s/'//" | sort -u | tr '\n' ' ')"
done
```

For a set of packages, read each `package.json`'s `dependencies` instead. An edge points **at what
the source imports**.

A real package has far more modules than a diagram holds (`@dxos/compute-runtime` has 40). To cut it
to ≲ 14 nodes:

- Drop `testing/`, `errors`, constants, ids, and helpers that nothing interesting imports.
- Keep the modules with the most internal edges and the largest files (`wc -l`); they carry the story.
- Group by role (often the subdirectory: `triggers/`, `services/`), at most 3 groups.
- When you drop a module, keep the edge it relayed: `A → b-helper → C` becomes `A → C`.

## 2. Write the DSL

```
diagram flow=down
group local "Local runtime" {
  node PM "ProcessManager" ref="packages/core/compute/compute-runtime/src/ProcessManager.ts"
  node Invoker "ProcOpInvoker" right-of PM
  node Store "ProcessStore" below PM
}
group remote "EDGE runtime" right-of local {
  node RPM "RemoteProcessMgr"
}
edge PM owns Store "persist"
edge PM -> Invoker
edge Invoker -> PM "spawn child"
edge PM -> RPM:top "spawn on EDGE"
```

- **Start with no placement hints.** The engine then also tries the mermaid engine's placements and
  keeps the better layout. Add a hint only to fix something you saw in the render (step 4); a hint
  that does not fix a visible problem usually makes the layout worse.
- **Meaning, not markers.** Name the relationship and the renderer draws the right end:
  - `extends`: hollow triangle;
  - `implements`: dashed line, hollow triangle;
  - `composes`: filled diamond;
  - `owns`: hollow diamond;
  - `depends-on`: dashed line, open arrow;
  - `one-to-many`: bar and crow's foot;
  - `many-to-many`: crow's feet at both ends;
  - `->`: a plain arrow.

  The left end of a relationship word is the child, the whole, the owner or the "one" side.

- **Placement:** `right-of X`, `left-of X`, `above X`, `below X`, `same-row X`, `same-col X`. These are
  rules; prefix one with `~` to make it a preference. Exact positions are `@cell(c,r)` or `@ x,y`.
  Groups take the same relations to other groups, plus `gap=N`.
- **Group shape:** `group G … compact` keeps the frame near-square; `max-width=N` caps it at N
  columns. `diagram aspect=W:H` leans the whole drawing toward that shape.
- **Routing:**
  - sides: `A:left -> B:top|left`; `A:~left` (or `A:~left|top`) is a preference that gives way to a
    route with fewer bends;
  - waypoints: `via x,_`, `via _,y`, `via cell(1.5,_)` for the gutter between columns 1 and 2, or
    `via cell(_,1.5)` for the gutter between rows 1 and 2;
  - shared trunks: `edge A -> B, C bus` fans out of A; `edge B, C -> A bus` gathers into A with one
    arrowhead; `bus=<name>` joins separate edges. A bus the engine cannot draw is drawn as separate
    edges with a warning.
- **Units:** `gap`, `grid`, `box`, `@ x,y` and `via x,_` are pixels; `cell(…)` and `max-width` are grid
  cells.
- **Precedence:** pins, then hard relations, then `~` relations and `~` sides. A relation between
  members of different groups drags the frames too: `node A below X` with X in another group widens
  A's frame to reach X's column, leaving empty cells inside (the report says
  `Group "…" is stretched`). Relate the groups instead (`group B below A`).
- **≲ 14 nodes, ≤ 3 groups, no nested groups.** Past that, crossings climb fast; split into two
  diagrams.
- **Labels ≤ 17 chars.** Boxes are a fixed width and a label is drawn on one line. The node id can
  stay long; shorten only the quoted label.
- Label only the edges that say something (`"invokes handlers"`); unlabelled edges route more cleanly.
- `diagram group node edge cell via bus compact` are reserved; quote them to use them as ids.
- Give every node `ref="<repo-relative path>"` so the diagram can be checked against the code.

### Sequence and data-flow diagrams

`diagram kind=sequence` draws an interaction over time. Participants are the nodes, as columns in the
order you declare them; messages are the edges, as rows in the order you write them, so the source
order IS the layout and placement hints, sides, waypoints and buses are ignored with a warning.

```
diagram kind=sequence
node User role=actor
node App "Composer"
node Router "EDGE router"
edge User -> App "open space"
edge App calls Router "query"
edge Router returns App "objects"
fragment loop "every 5s" { edge App sends Router "heartbeat" }
note Router "merges local state"
```

`calls` opens an activation bar that the matching `returns` closes; `sends` is asynchronous; `->` is
a plain message. `note A`, `note A:left`, `note A, B`, and `fragment alt|opt|loop|par|break|critical
["guard"] { … } else ["guard"] { … }` (nestable) complete the vocabulary.

`diagram kind=dataflow` places nodes like a structure diagram, but each has a `role`: `process` (the
default, a bubble), `store` (a box with its D-number) or `external` (a shaded box). Label every edge
with the data that flows. The report warns about data moving without a process, a process with no
inputs or no outputs, and a store nobody reads.

The full reference the in-app agent reads is the `uml` skill text in
`packages/plugins/plugin-illustrator/src/skills/DrawingSkill.ts`. The Storybook bench, which shows the
rendered diagram, its DSL and its scores side by side, is
`plugins/plugin-illustrator/components/Constraints`.

## 3. Render

The renderer runs straight from source under vite-node (`scripts/vite.render.config.ts`), so it needs
no build, only `node_modules`. In the cloud sandbox without them, run
`bash .config/claude-code-setup.sh` first and put proto on the path
(`export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"`); see `cloud-sandbox`. If the run fails with
`Failed to load url @dxos/protocols`, that package's generated code is missing: run
`moon run protocols:build` once (≈ 1 minute, in the background) and render again.

Write the `.dx` in the scratchpad and pass its absolute path:

```bash
CHROMIUM_PATH=/opt/pw-browsers/chromium moon run plugin-illustrator:render-diagrams -- /abs/path/to/compute-core.dx
```

It writes `compute-core.dx.svg` and `compute-core.png` beside the source, in about 10 seconds, and
changes nothing in the repo. `CHROMIUM_PATH` is the cloud sandbox's pre-installed browser; omit it
locally.

The report line per diagram is the first verdict:

```
compute-core: 17 nodes, 20 connectors, 1 crossings, 13 bends
  warning: Connectors "edges/Assistant-ComputeRuntime-13" and "edges/AgentRuntime-Compute-14" cross.
```

- `nodes` counts group frames too.
- DSL problems print first (an unknown relationship, a reference to an undeclared node, a hint
  relaxed because it contradicted another).
- Warnings are soft metrics. An `error` (overlap, a route through a node, a DSL error) fails the task
  with exit 1.

## 4. Look at it before you submit it

**Never send, commit or attach a diagram you have not looked at.** The report counts crossings and
bends. It cannot tell you that a label sits on the wrong arrow, that a label lies on a group's dashed
border, that a frame is stretched with empty cells, or that the whole thing came out as a long strip.

`Read` the PNG and check each of these:

1. Every label sits beside its own arrow, not on another arrow or on a frame border.
2. Arrows read in the flow direction, and parents sit above their children.
3. No group frame is stretched around empty space, and the drawing is not a thin strip.
4. Every arrow's end shows the relationship you meant (triangle, diamond, crow's foot, dashes).
5. Nothing overlaps and no text spills out of its box.

When something is wrong, fix it in the DSL with the smallest hint that addresses it. For example:

- `same-row`/`below` to line boxes up;
- a side (`A:right ->`, or `A:~right` to only prefer it) for an arrow that wraps around a box;
- `via cell(…)` to move a route into a clearer gutter;
- `compact` or `max-width=N` on a group that came out as a strip;
- a shorter label.

If a hint makes the render worse, or a warning says it was relaxed, remove it rather than adding a
second hint to fight it.

Then render and look again. Stop after about four rounds. If it still looks wrong, say what is wrong
when you show it rather than hiding it.

## 5. Show it

Send the PNG, and the `.dx.svg` when the user may want to edit it, with `SendUserFile`. State the
report's crossings and bends, and any defect you saw and could not fix.

To score the drawing against the rule library (`@dxos/diagram` `rules/DIAGRAM.mdl`: crossings, flow,
alignment, groups, spacing, labels), run
`moon run plugin-illustrator:appeal-diagrams -- /abs/path/to/x.mmd`. Add `--judge clef` to have Clef
grade the rendered image too; it needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

For a PR, attach the PNG per `hosting-artifacts` (`gh --attach`, R2 as the fallback) rather than
committing it.

## Diagrams in an `.mdl` spec

Embed the DSL in the spec itself as a ` ```diagram ` fence, so the diagram is versioned and reviewed
with the requirements it illustrates. plugin-code's `SpecArticle` (and its storybook) lays out every
` ```diagram ` fence and draws it below the source (`diagramPreview()` in `@dxos/diagram/extension`).
For readers on GitHub, commit the render beside the spec (`spec/diagrams/<name>.dx.svg`) and link it
with a Markdown image above the fence; keep the `.dx` file in step with the fence.

## Diagrams in an Artifact page

Every diagram in an Artifact page is a plugin-illustrator render. This overrides the harness's
`artifact-diagramming` skill and its "hand-author inline `<svg>`" mechanics. Do not hand-write SVG,
do not generate SVG with a script, and do not use a ` ```mermaid ` fence or `<pre class="mermaid">`:
a drawing made any other way cannot be checked against the code (`ref=`) or opened in Composer.

1. Write one `.dx` per figure in the scratchpad, ≲ 14 nodes each (steps 1–2). Carry meaning in
   labels and `stroke=dashed` (e.g. dashed for a proposal), not in colour: a node's or edge's `color=`
   is parsed but not drawn (nodes too), and a group's colour comes from the engine's palette.
2. Render them all in one run (`render-diagrams -- a.dx b.dx …`) and `Read` every PNG (step 4).
3. Publish each `.dx.svg` beside the page through the Artifact tool's `files` map (e.g.
   `"diagrams/x.dx.svg": "dx/x.dx.svg"`) and show it with `<img src="diagrams/x.dx.svg" alt="…">`
   inside a `<figure>` whose `<figcaption>` states the claim. Do not inline the SVG: it carries a
   global `<style>` (`svg { … }`, `.stroke-current`) and fixed marker ids (`dx-arrow`) that leak into
   the page and collide between figures. As a file it also keeps its `dx-payload`, so a reader can
   download it and open it in Composer.
4. The render is drawn for a white ground in both themes; give the `<img>` a white background and
   `max-width: 100%; height: auto` rather than recolouring it.
5. Keep the `.dx` sources beside the page in the scratchpad, so the next revision edits the DSL and
   re-renders rather than patching the SVG.

## Corpus diagrams

A diagram meant to be committed goes in `plugin-illustrator/docs/diagrams/`. The corpus is still
mermaid, because it doubles as the layout engine's eval set. Running `moon run
plugin-illustrator:render-diagrams` with no arguments re-renders every corpus `.mmd` (≈ 15 s);
unchanged ones come out byte-identical. `src/model/corpus.test.ts` snapshots the corpus metrics, so
run `DX_RUN_MANUAL_TESTS=1 moon run plugin-illustrator:test -- src/model/corpus.test.ts` and commit
the updated snapshot with it.

Mermaid conventions (full text in `plugin-illustrator/docs/diagrams/README.md`):

- Only this subset parses: `flowchart TB|LR`, `subgraph id [Label] … end` (no nesting), `Id[Label]`,
  `A --> B`, `A -->|label| B`. Anything else is silently ignored, so check the node count in the
  report.
- End with one `%% ref <Id> <repo-relative path>` per node.
- `-- --scoreboard` compares the `layered` and `elk` strategies.
