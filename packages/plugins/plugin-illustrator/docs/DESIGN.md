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
4. **Flowchart dialect** — move `mermaid.ts` placement onto the same engine seam.
