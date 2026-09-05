# Diagram layout engines — design

Status: spike (2026-08). Owner: plugin-illustrator.

## Context

The illustrator dialects (mermaid flowchart, UML class, UML grid) compile diagram _models_ into
the renderer-neutral scene DSL; the dialect owns layout because mermaid carries no coordinates
(see `src/model/dialect.ts`). Today's layout is hand-rolled:

- `layout.ts` — longest-path layering with DFS cycle-breaking (shared ranking).
- `uml.ts` — variable-size compartment boxes, lanes centered on the widest lane.
- `uml-grid.ts` — equal-size cells on the tldraw grid (`GRID = 32`), a one-pass weighted
  barycenter column assignment (`assignColumns`), and pluggable orthogonal Z-routing.

The hand-rolled column pass is a heuristic: it has no crossing-minimization sweep, no proper
coordinate assignment, and degrades as diagrams grow. This spike evaluates delegating placement
to an off-the-shelf layered-layout engine while keeping everything else (parsing, measuring,
grid snapping, routing, emission) ours.

## Goals

1. **Align to a grid** — node edges sit on the tldraw document grid; connectors run through
   gutters on grid lines.
2. **Minimize line crossings** — proper layer-sweep crossing minimization, not declaration order.
3. **Minimize jagged lines** — coordinate assignment that favors straight (vertically aligned)
   chains; orthogonal routes with as few bends as possible.
4. **Arrows read upward toward abstractions** — inheritance, realization, and dependency targets
   rank above their sources (`relationRanks` orientation); containment/association flow down.
5. **Gather peers on the same axis** — classes at the same depth share a lane; siblings of a
   common parent sit adjacent.

## Engine comparison

|                         | hand-rolled (`uml-grid`)         | dagre (`@dagrejs/dagre`) | ELK (`elkjs`)                                               |
| ----------------------- | -------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Layering                | longest-path + back-edge removal | network-simplex          | network-simplex (+ constraints)                             |
| Crossing minimization   | none (one-pass barycenter)       | median/greedy sweep      | layer sweep (Sugiyama)                                      |
| Coordinate assignment   | integer columns                  | Brandes-Köpf-ish         | Brandes-Köpf / network-simplex                              |
| Orthogonal edge routing | ours (Z-router)                  | splines (unused)         | native `ORTHOGONAL` sections                                |
| Constraints (future)    | —                                | limited                  | layer/position constraints, `INTERACTIVE` modes, partitions |
| Size / runtime          | 0                                | ~30 kB, sync             | ~1.4 MB (bundled), async                                    |

Both engines are wired behind one seam (below); ELK is the strategic choice (constraints,
interactive re-layout, orthogonal routing) and dagre the lightweight baseline.

## Architecture

The engines replace exactly one step — placement. Everything else is unchanged and shared with
the hand-rolled dialects:

```text
parse (uml.ts) → measureCell (uml-grid.ts) → PLACE → snap to GRID → emit (uml-grid.ts)
                                              ↑
                            lanes+columns | dagre | elk
```

- `uml-grid.ts` exports its `measureCell` and `emit` halves; its own `compile` composes them
  with the barycenter placement.
- `uml-engine.ts` provides `compile(source, { engine: 'dagre' | 'elk', ... })` returning
  `Promise<Scene.Command[]>` (ELK is async; dagre is wrapped for a uniform surface). Engines
  receive uniform cells and the _oriented_ edge list (up-kinds reversed, matching
  `relationRanks`), and return node rects, which are then snapped to `GRID` and normalized to a
  zero origin.
- Routing stays ours (below): engine placement + grid-snapped orthogonal routes satisfies goals
  1–3 without reconciling engine-produced route points with post-snap positions. ELK's native
  `ORTHOGONAL` sections are a follow-up (`useEngineRoutes`) once snapping is done inside the
  engine pass (fixed port positions + spacing as multiples of `GRID`).
- The scene output is renderer-neutral, so the same commands render via tldraw, the SVG variant,
  or a future excalidraw builder.

### Routing (`uml-grid.ts` + `ortho-router.ts`)

Connector routing is shared by every placement (grid, engines, rules, search) and layers four
guarantees, applied in `emit`:

1. **Ports** — terminals attaching to the same node side spread across it (ordered by peer
   position) instead of stacking on the center, so approach segments of distinct relations never
   coincide.
2. **Straightening** — when a relation's nodes overlap on the cross axis, both terminals snap to
   a shared free coordinate so the connector is a single straight segment rather than a jog.
3. **Channels** — bent routes take distinct slots keyed on the shared gutter line (integer
   offsets, so every bend sits on the minor grid); aligned parallels shift sideways instead of
   coinciding.
4. **Obstacle avoidance** (`makeAvoidingRouter`, the default) — A* over the fine grid with a
   turn-dominant cost: a route never crosses a node, takes the fewest bends avoidance allows
   (length breaks ties), pays a usage penalty for cells earlier edges ran through, and a
   single-jog Z centers its middle run equidistant from the two node borders (kept only when the
   shift clears obstacles and foreign channels). The plain `zRouter` (orthogonal Z through the
   rank gutter) remains the per-edge fallback and the cheap route model for scoring.

### Engine options mapping

- dagre: `ranker: 'network-simplex'`, `ranksep = gapMain`, `nodesep = gapCross`,
  `rankdir = TB | LR`.
- ELK: `elk.algorithm: layered`, `elk.direction: DOWN | RIGHT`,
  `elk.layered.spacing.nodeNodeBetweenLayers = gapMain`, `elk.spacing.nodeNode = gapCross`,
  `elk.layered.nodePlacement.strategy: BRANDES_KOEPF` (straightness),
  `elk.layered.considerModelOrder.strategy: PREFER_NODES` (stable sibling order).

## Rule-based grouping (`uml-rules.ts`)

Generic engines optimize global metrics; they cannot know that an inheritance tree should _read_
as a tree. The rule layer sits above placement: prioritized `GroupRule`s claim disjoint node
groups from the model and lay each out internally; leftovers become singletons; groups then pack
as super-nodes (ranked by their up-oriented cross-group edges) with non-overlapping dashed
borders, and the shared channel/port router connects across.

Built-in rules, by priority:

1. `inheritanceTreeRule` — each supertype with subtypes claims its tree: hierarchy stacked
   vertically (root on top, arrows up), peers on one horizontal axis, parents centered over
   their subtrees (tidy tree).
2. `linearChainRule` — the longest path through the remaining up-oriented relation graph
   renders as a left-to-right row.

Rules are plain functions, so DSL axis constraints (below) can compile to a generated rule, and
an engine-backed group (ELK laying out one group's interior) is just another rule.

### Scored placement search (`uml-search.ts`)

On top of the groups sits a scored search:

- **Score**: +1 per straight or single-bend (L) connector, −1 per crossing edge pair, computed
  over cheap Z-routes (the A* router draws the final picture).
- **Search**: the longest chain seeds the center; a greedy tree walk repeatedly places the
  unplaced group connected to the earliest-placed node, trying axis-aligned candidates around
  the anchor (below/above preferred, then right/left, sliding off collisions) and keeping the
  best-scoring one.
- **Selection**: the final layout is whichever of {search, rank packing} scores higher.

**Can ELK/dagre implement this?** No — the search is necessarily custom. Both are one-shot
global optimizers: no scoring callback, no incremental "place the next node" API, no way to
substitute a custom objective. They fit the mechanism only as (a) group-interior layouters, (b)
extra whole-layout candidates fed to the same scorer, and (c) ELK `INTERACTIVE` as a polish
pass over the search's result. The custom part stays small (~200 lines) precisely because the
groups reduce placement to uniform cells on a grid.

## Flowchart engine (`mermaid-engine.ts`)

The mermaid flowchart dialect has two compilers. `mermaid.ts` is the original hand-rolled layered
pass (fixed 100×50 nodes, bound arrows drawn as straight center-to-center segments). `mermaid-engine.ts`
moves it onto the engine seam for block diagrams that must read well:

- **Compound layout.** Subgraphs become ELK hierarchical nodes (`elk.hierarchyHandling:
INCLUDE_CHILDREN`), so crossing minimization and layer assignment respect containment instead of
  drawing a frame around wherever the members landed. Frame padding reserves a top band for the label.
- **Uniform grid cells**, sized to the longest label wrapped at `maxWidth`, snapped to `GRID` like the
  UML grid dialect. Node rects are snapped and frames are then **recomputed from their snapped
  members**, so snapping can never break containment.
- **Shared routing.** Connectors take `makeAvoidingRouter` over the node rects (frames are containers,
  not obstacles) with `zRouter` as the per-edge fallback; the emitted `line` + `arrow` pair is the same
  shape the UML emitters produce, so `Diagnostics` reads it unchanged. `RoutedRelation.relation` was
  widened to `Layout.LayoutEdge` for this — the routers only ever read endpoints.
- **Not modelled:** nested subgraphs (the parser records only the innermost group), edge styles other
  than the arrow, node shapes other than the rectangle.

## Diagnostics (`diagnostics.ts`)

`Diagnostics.analyze(objects)` is a **pure function over an emitted scene** — not a return channel
threaded through `emit`. Connectors are emitted with explicit points and nodes as boxes with origins,
so every quantity worth measuring is already in the scene. That choice buys three things: zero churn
across the placement strategies (they were not touched), one analyzer for every dialect including
the raw `scene` dialect an agent authors by hand, and analysis of scenes read _back_ from a renderer
after the user dragged things.

| Code                 | Severity | Meaning                                                                     |
| -------------------- | -------- | --------------------------------------------------------------------------- |
| `node-overlap`       | error    | Two boxes from different objects intersect without one containing the other |
| `route-through-node` | error    | A connector runs through the interior of a box it does not belong to        |
| `label-overflow`     | error    | A box's label, wrapped at its width, does not fit its height                |
| `edge-crossing`      | warning  | Two connectors properly cross (shared ports do not count)                   |
| `excessive-bends`    | warning  | A connector bends more than `maxBends` times (default 3)                    |

Two rules learned from the first run against the fixtures: a box that encloses another object's box
is a **container** (subgraph frame, rule group) and is never an obstacle; and a label's last line
carries no trailing leading — `lineH ≈ 1.35em` per `FONT_METRICS`, so the block is
`(lines − 1) · lineH + lineH / 1.35`.

**Errors gate; warnings trend.** `errors(report)` is asserted empty in CI for every strategy over the
shared fixtures; the soft `Metrics` (crossings, bends, area) are golden-filed with `toMatchSnapshot`,
so a layout change shows up as a reviewable `crossings 7 → 4` diff rather than a threshold argument.
The same report is the scorer for the generation eval (below): a diagram the agent produced is judged
legible by exactly the machinery that judges our own layouts.

### Eval tiers

1. **Layout metrics** — `diagnostics.test.ts`, `mermaid-engine.test.ts`: corpus × strategies, hard
   codes asserted, soft metrics snapshotted. Deterministic, CI.
2. **Engine A/B** — a script over the same corpus printing a strategy × metric table; how engine
   choice and constant tuning get justified with numbers instead of screenshots. Not CI.
3. **Generation** — evalite in `assistant-evals`: prompt the agent to diagram an area from source,
   score with (a) deterministic checks (every node id resolves to a real path/symbol, no orphans),
   (b) the Tier‑1 report on the result, (c) an LLM judge for faithfulness. Scorer interface first,
   memoized fixtures later.

The corpus lives in `docs/diagrams/*.mmd` and is simultaneously the deliverable (rendered `.svg`
beside each source) — one copy, so it cannot drift from what the tests exercise.

## Selection

Selection is **owned by the host, implemented by the renderer**. `DrawingVariantSurfaceProps` carries
`selection` (scene object ids), `onSelectionChange`, and `onActivate`; ids are always scene object
ids — never tldraw shape ids or excalidraw element ids — and each variant translates using the
identity it already stamps on its records (`meta.object` / `customData.object`), the inverse of what
its `read` does. `DrawingArticle` reads and writes the `react-ui-attention` Selection ViewState under
the surface's `attendableId`, so a companion surface showing related content reads one source
regardless of which renderer drew the picture, and `LayoutOperation.Select` gives agents the same
lever. `SceneSvg` implements click / shift-toggle / background-clear / double-click directly;
tldraw mirrors its page-state `selectedShapeIds`; excalidraw mirrors `appState.selectedElementIds`
(activation is not wired there — double-click enters text editing).

`WorldObject.ref` (a DXN or URI) says what an object depicts. Activation resolves an ECHO ref through
`db.makeRef(uri).load()` and opens it with `LayoutOperation.Open`; URI refs (a repository path, say)
are carried for tooling and have no default activation yet.

## SVG renderer as a variant

`SceneSvg` renders scene objects as plain SVG. To make it a peer of the tldraw/excalidraw
renderers rather than a story-only component, it is contributed as a `DrawingVariant`
(`IllustratorCapabilities.VariantProvider`), like `plugin-tldraw`'s:

- `SVG_SCHEMA` discriminates the base `Drawing.Canvas`.
- `SvgHandler` (a `ContentHandler`) stores scene elements as records verbatim — the scene DSL
  _is_ the persistence format — so `applyCommands` provides upsert/remove/move for free and
  `read` reconstructs the scene losslessly.
- `SvgArticle`/`SvgCard` render the canvas through `SceneSvg`.

This gives agents (via the drawing/UML skills) a third render target with zero renderer
dependencies, useful for export and for headless/CI rendering.

## Future work

1. **Hand curation** — users drag nodes; `move-object` already persists positions through the
   builder. Re-layout should then run ELK in `INTERACTIVE` mode (crossing minimization +
   placement seeded from current coordinates), so a re-generate respects manual arrangement
   instead of resetting it.
2. **DSL axis constraints** — extend the mermaid-adjacent source with layout directives, e.g.
   `%% horizontal: A, B, C` (same lane, this order) and `%% vertical: A, X` (same column).
   Mapping: horizontal → ELK `inLayerConstraint`/same layer assignment; vertical → shared
   `elk.alignment` / position constraint. The parser already ignores unknown lines, so the
   directives are backward-compatible comments.
3. **Engine-native orthogonal routing** — see above (`useEngineRoutes`).
4. **Overflow of free text** — `Diagnostics` checks box labels only; a `text` element (UML member
   list) is not yet measured against the frame that holds it.
5. **Nested subgraphs** in the flowchart parser; ELK's compound layout already supports them.
