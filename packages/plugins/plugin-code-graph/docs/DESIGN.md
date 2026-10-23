# Code Graph — design

## Goal

An article that shows part of the codebase as a graph, which the assistant can query and change. It is
an experiment with two layouts for the same graph: the illustrator's semantic engine and a
force-directed layout. It reuses the canvas and illustrator code the same way the projects plugin's
feature maps do.

## Pieces

| Piece              | Where                                                               | Job                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `CodeGraph`        | `src/types/CodeGraph.ts`                                            | ECHO object: `nodes` (IRI, label, kind, package group, dragged position), `edges` (from, to, predicate), `layout`.                         |
| Operations + skill | `src/types/CodeGraphOperation.ts`, `src/operations/`, `src/skills/` | `Query`, `Inspect` (read the index); `Create`, `Read`, `AddFromQuery`, `AddNodes`, `AddNeighbors`, `Remove`, `SetLayout` (change a graph). |
| Client             | `src/client/`                                                       | `fetch` to the same-origin `/api/code-index` route; responses decoded with Effect Schema.                                                  |
| Vite plugin        | `src/vite-plugin/` (`./vite-plugin` export)                         | Dev-server middleware that spawns `code-index mcp` and calls its read-only tools over stdio JSON-RPC.                                      |
| Layouts            | `src/graph/Semantic.ts`                                             | Writes the graph as illustrator DSL and solves it with `SemanticEngine` (one restart).                                                     |
| Canvas             | `src/components/CodeGraphCanvas/`                                   | `react-ui-canvas/scene`'s dynamic projection, as in `plugin-projects`' `FeatureCanvas`.                                                    |
| Drawing            | `src/components/CodeGraphDiagram/`                                  | The illustrator's `SceneSvg` for the full drawing (frames and routed arrows).                                                              |

## Why a vite route, and why MCP

The index is an oxigraph store behind a Rust Node-API addon, and only one process may open it. The
browser cannot open it, and the `code-index` web server has no plain SPARQL route. The MCP server
already exposes exactly the read-only verbs needed (`query`, `describe`, …). The dev server runs it as a
child process, so the vite process does not load the addon, and the route is same-origin, so no CORS
is needed. A JSON content type forces a CORS preflight that the route never answers, and only loopback
callers are accepted (the same checks as `plugin-dev-shell`'s shell route). Under `tauri dev` the webview
loads the same dev server, so the route works there too.

## Layouts and reuse

One canvas serves three of the four layouts. The dynamic projection takes a `GraphModel` and an
`Overlay` of positions:

- **force** and **rank**: the projection's own `arrange` (`force` is d3-force snapped to slots;
  `crossings` orders rank rows to cut crossings). The overlay holds only boxes the user dragged.
- **illustrator**: `Semantic.layout` writes the DSL (`node nI "label" ref="<iri>"`, `edge a depends-on b`,
  one `group` frame per package when there are 2–6 packages), solves it, and reads back each box's centre.
  The centres become the overlay, so the canvas draws the illustrator's placement. Box size and pitch are
  shared constants, so the positions match the canvas boxes 1:1.
- **diagram**: the same solution's world objects rendered by `SceneSvg`, read-only, with the engine's
  package frames and gutter-routed arrows that the canvas does not draw.

Dragging a box writes its position to the node. In illustrator mode only the positions that differ from
the computed layout are saved, so the layout still owns every box the user did not move.

## Limits

- The semantic engine is synchronous and runs on the main thread after the change paints. It is fast
  for tens of boxes; large graphs should use `force`.
- The illustrator draws frames for 2–6 packages only, because the engine keeps more groups poorly.
- No production path: a deployed Composer has no dev server. A Tauri-native path (a sidecar or a Rust
  command over the same store) would be the next step.
