---
'@dxos/graph': minor
'@dxos/plugin-deck': minor
---

Composer now unloads the graph below workspaces you are not looking at, and rebuilds them when you return. A node declares how many levels below it stay loaded (`GraphBuilder.RetainDepthProperty`), several `Retention`s name the nodes they need kept, and the builder releases what falls outside. `GraphBuilder.wasReleased` reports whether a missing node is being rebuilt. Space and file-system workspaces declare depth `0`, and the deck keeps the active workspace, the previous one, and any workspace with a plank on screen.

Breaking: companions now attach through `AppGraphNode.companionRelation()` rather than `child`, so an extension returning `AppNode.makeCompanion` or `makeDeckCompanion` must declare that relation, and companions are read with `graph.connections(id, AppGraphNode.companionRelation())`. `Store` requires `release` and `outgoing`, `setRetention` takes a list, `AppCapabilities.AppGraphRetention` is a multi capability, and `UrlGrammar.linkedPrefix` and `GraphTreeModelOptions.isVisible` are removed.
