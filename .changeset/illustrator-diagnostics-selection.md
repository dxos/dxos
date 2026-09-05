---
'@dxos/plugin-illustrator': minor
'@dxos/plugin-tldraw': minor
---

Scene diagnostics, renderer-implemented selection, and an engine-backed flowchart dialect.

- `Diagnostics.analyze(objects)` reports layout defects of any emitted scene — node overlaps, connectors drawn across nodes, labels that do not fit (errors) and edge crossings / excessive bends (metrics) — independent of the dialect or placement strategy that produced it.
- `WorldObject.ref` (a DXN or URI) says what an object depicts; the flowchart parser sets it from a portable `%% ref <id> <target>` directive.
- `DrawingVariantSurfaceProps` gains `selection`, `onSelectionChange` and `onActivate`, expressed in scene object ids. `DrawingArticle` owns the selection in the attention ViewState under the surface's attendable id; `SceneSvg`, the tldraw canvas and the excalidraw article implement it against their own record identity.
- `MermaidEngine.compile` lays out mermaid flowcharts with ELK as a compound graph (subgraphs are hierarchical nodes), uniform grid cells, and the shared obstacle-avoiding router. The router's A* now uses a turn-aware heuristic and an area-scaled budget, so long routes on large diagrams no longer fall back to the Z-router.
