---
'@dxos/app-toolkit': minor
'@dxos/plugin-navtree': minor
---

A navtree drop between containers that share a move scope moves the item, and any other drop links it, drawn with a dashed indicator; rearranged rows land under the drop line, which now sits in the gap between rows, and app-graph applies updates to nodes already in the graph within a per-frame budget, so an edit renders in the frame it was made. `ContainerModel` replaces `CollectionModel`, `Obj.parentAtom` follows an object's parent reactively, and `Tree` takes `getDropKind`. Breaking: `CollectionModel` is renamed `ContainerModel`, `Tree`'s `blockInstruction` becomes `getDropKind`, and navtree nodes use `onMoveOut`, `onMoveIn` and `onLink` in place of `onTransferEnd`, `onTransferStart` and `onCopy`.
