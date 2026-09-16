---
'@dxos/graph': minor
'@dxos/app-graph': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-graph': patch
'@dxos/plugin-deck': minor
'@dxos/plugin-navtree': patch
---

Unload the graph of workspaces you are not looking at.

Every node a session materialized stayed in the graph, with its slot, indexes, provenance and a mounted
atom, so a session that visited ten workspaces held all ten.

`GraphBuilder` has a `Retention` port beside `Store`: an atom naming the roots that may be unloaded.
When its answer changes, the builder releases what `GraphModel.subgraph` finds below those roots, the
nodes nothing outside them still points at. The graph root and the inline children a root arrived with
are never released. `Store.subgraph` and `Store.release` are now required, `GraphBuilder.wasReleased`
tells a caller whether a missing node is being rebuilt, and `GraphModel.descendants` is replaced by
`subgraph`.

plugin-deck derives the answer from its own state: every space workspace except the active one, the
previous one, and any workspace a plank on screen belongs to. Unloading is not deletion. Revisiting a
workspace rebuilds it from its connectors, remembered planks keep their URL, `Open` waits briefly for a
subject that was unloaded, and the nav tree re-expands the items that were open.
