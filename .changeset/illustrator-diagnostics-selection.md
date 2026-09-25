---
'@dxos/plugin-illustrator': minor
---

Scene diagnostics, renderer-implemented selection, and an engine-backed flowchart dialect with lattice placement.

- `Diagnostics.analyze(objects)` reports layout defects of any emitted scene — node overlaps, connectors drawn across nodes, labels that do not fit (errors) and edge crossings / excessive bends (metrics) — independent of the dialect or placement strategy that produced it. `DrawingOperation.Generate` returns the report as `diagnostics` so an agent can repair and regenerate; the UML skill instructs it to.
- `WorldObject.ref` (a DXN or URI) says what an object depicts; the flowchart parser sets it from a portable `%% ref <id> <target>` directive.
- `DrawingVariantSurfaceProps` gains `selection`, `onSelectionChange` and `onActivate`, expressed in scene object ids. `DrawingArticle` owns the selection in the attention ViewState under the surface's attendable id; `SceneSvg`, the tldraw canvas and the excalidraw article implement it against their own record identity. Activating an object with an ECHO `ref` opens it.
- `MermaidEngine.compile` lays out mermaid flowcharts with ELK as a compound graph (subgraphs are hierarchical nodes), quantizes node origins to a lattice of the cell size so aligned neighbours share an axis and connectors run straight, and routes with the shared obstacle-avoiding router using straightened ports. The router's A* uses a turn-aware heuristic and an area-scaled budget, so long routes on large diagrams no longer fall back to the Z-router. `Generate` uses this engine for flowcharts.
- `docs/diagrams/` holds six architecture diagrams of DXOS and EDGE (mermaid sources with refs, rendered SVGs) that double as the layout eval corpus; `moon run plugin-illustrator:render-diagrams` re-renders them and prints the report. The `Layout` storybook bench shows source, mermaid.js reference and engine layout side by side.
