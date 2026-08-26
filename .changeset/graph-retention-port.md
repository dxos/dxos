---
'@dxos/graph': minor
'@dxos/app-graph': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-graph': patch
'@dxos/plugin-deck': minor
---

Unload the graph of workspaces you are not looking at.

Until now every node the session ever materialized stayed in the graph: its slot, its indexes, its
provenance and a mounted atom apiece. A session that visited ten workspaces held all ten, none of it
reachable from anything on screen.

`GraphBuilder` gains a `Retention` port beside `Store`. It asks one question, once per settled
flush: which subgraph roots may be unloaded. The builder owns the mechanism and the cadence and
stores no policy state of its own, so an implementor answers from state it already keeps.
`GraphModel.subgraph` collects what is safe to release, which is narrower than plain reachability:
a node an outside parent also holds stays, along with everything reachable only through it.

plugin-deck implements the port as an LRU over workspace roots, keeping the two most recent
(`loadedWorkspaces`). Pinned workspaces are exempt. Unloading is not deletion: revisiting a workspace
rebuilds it from its connectors.
