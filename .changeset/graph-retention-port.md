---
'@dxos/graph': minor
'@dxos/plugin-deck': minor
---

Composer now unloads the parts of the graph nothing is showing, and rebuilds them when you return. Plugins contribute `AppCapabilities.AppGraphRetention`s naming the nodes they need, as `{ id, depth? }`, and once any is installed the builder releases what none of them reaches below the root's children. `GraphBuilder.wasReleased` reports whether a missing node may still be rebuilt, and `releasedVersion` changes whenever that answer may have. The deck keeps the whole of the active workspace, the previous one, and any workspace with a plank on screen; the debug panel keeps its tree while it is open.

Breaking: companions now attach through `AppNode.companion` rather than `child`, so an extension returning `AppNode.makeCompanion` or `makeDeckCompanion` must declare that relation, and companions are read with `graph.connections(id, AppNode.companion)`. `GraphBuilder.Store` requires `release` and `outgoing`, `setRetention` takes a list, `AppCapabilities.AppGraphRetention` is a multi capability, and `UrlGrammar.linkedPrefix` and `GraphTreeModelOptions` are removed; the app graph learns the companion relation from `UrlGrammar.linkedRelation` and the builder's `expandWithChildren`.
