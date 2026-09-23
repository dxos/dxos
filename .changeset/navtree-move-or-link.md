---
'@dxos/app-toolkit': minor
'@dxos/plugin-navtree': minor
---

A navtree drop between containers that share a move scope moves the item, a drop onto a target that takes links links it, and the indicator is dashed when the item will end up listed with its parent elsewhere; rearranged rows land under the drop line, which now sits in the gap between rows. App-graph applies updates to nodes already in the graph on a microtask while the frame's budget lasts and defers the rest to its scheduler, so a small edit renders in the frame it was made. `ContainerModel` replaces `CollectionModel`, `Obj.parentAtom` follows an object's parent reactively, and `Tree` takes `getDropKind`. Breaking: `CollectionModel` is renamed `ContainerModel`, `Tree`'s `blockInstruction` becomes `getDropKind`, and navtree nodes use `onMoveOut`, `onMoveIn` and `onLink` in place of `onTransferEnd`, `onTransferStart` and `onCopy`.
