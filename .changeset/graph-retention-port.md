---
'@dxos/graph': minor
'@dxos/app-graph': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-graph': patch
'@dxos/plugin-deck': minor
'@dxos/plugin-navtree': patch
---

Unload the graph of workspaces you are not looking at.

Every node a session materialized stayed in the graph, with its slot, indexes, provenance and a
mounted atom, so a session that visited ten workspaces held all ten.

`GraphBuilder` has a `Retention` port beside `Store`. After each flush it asks which roots may be
unloaded, and when the answer changes it releases what `GraphModel.subgraph` finds below them: the
nodes nothing outside those roots still points at. The graph root is never released.

plugin-deck answers with every space workspace except the active one, the previous one, and any
workspace a plank on screen belongs to. Revisiting a workspace rebuilds it from its connectors, and
the nav tree re-expands the items that were open in it.
