---
name: drawing-diagrams
description: >-
  Draw an architecture diagram of DXOS code (a package, a module graph, a subsystem) by writing
  plugin-illustrator's semantic diagram DSL (`.dx`), rendering it, and looking at the image before
  showing it. Use when asked to draw, render, or show a diagram of the codebase, to "use the
  illustrator" on something, to add or regenerate a diagram in
  `packages/plugins/plugin-illustrator/docs/diagrams/`, or to judge the layout engine on a real graph.
  For a hand-drawn explanatory figure inside an Artifact page, use `artifact-diagramming` instead.
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

Mermaid (`.mmd`) still renders through the same task. Use it only for the existing corpus in
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
  Groups take the same relations to other groups, plus `gap=N` (pixels).
- **Routing:**
  - sides: `A:left -> B:top|left`;
  - waypoints: `via x,_`, `via _,y`, or `via cell(1.5,_)` for the gutter between columns 1 and 2;
  - shared trunks: `bus` on a fan-out from one source (`edge A -> B, C bus`), or `bus=<name>` across
    edges.
- **≲ 14 nodes, ≤ 3 groups, no nested groups.** Past that, crossings climb fast; split into two
  diagrams.
- **Labels ≤ 17 chars.** Boxes are a fixed width and a label is drawn on one line. The node id can
  stay long; shorten only the quoted label.
- Label only the edges that say something (`"invokes handlers"`); unlabelled edges route more cleanly.
- `diagram group node edge cell via bus` are reserved; quote them to use them as ids.
- Give every node `ref="<repo-relative path>"` so the diagram can be checked against the code.

The full reference the in-app agent reads is the `uml` skill text in
`packages/plugins/plugin-illustrator/src/skills/uml-skill.ts`. The Storybook bench, which shows the
rendered diagram, its DSL and its scores side by side, is
`plugins/plugin-illustrator/components/Constraints`.

## 3. Render

The renderer runs straight from source under vite-node (`scripts/vite.render.config.ts`), so it needs
no build, only `node_modules`. In the cloud sandbox without them, run
`bash .config/claude-code-setup.sh` first and put proto on the path
(`export PATH="$HOME/.proto/shims:$HOME/.proto/bin:$PATH"`); see `cloud-sandbox`.

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
- a side (`A:right ->`) for an arrow that wraps around a box;
- `via cell(…)` to move a route into a clearer gutter;
- a shorter label.

Then render and look again. Stop after about four rounds. If it still looks wrong, say what is wrong
when you show it rather than hiding it.

## 5. Show it

Send the PNG, and the `.dx.svg` when the user may want to edit it, with `SendUserFile`. State the
report's crossings and bends, and any defect you saw and could not fix.

To score the drawing against the rule library (`@dxos/diagram` `rules/DIAGRAM.mdl`: crossings, flow,
alignment, groups, spacing, labels), run
`moon run plugin-illustrator:appeal-diagrams -- /abs/path/to/x.mmd`. Add `--judge clef` to have Clef
grade the rendered image too; it needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

For a PR, publish the PNG with `hosting-artifacts` rather than committing it.

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
