---
'@dxos/plugin-presenter': minor
'@dxos/app-framework': patch
---

Add the `Presentation` type: an ordered deck of owned markdown slides and linked objects, shown in the navtree as a folder whose children can be reordered by drag. Collection decks, the `presentCollections` setting and the `./Settings` and `./PresenterCapabilities` exports of `@dxos/plugin-presenter` are removed. `@dxos/app-framework` exports `Surface.matchCandidates`, and `@dxos/app-toolkit` adds `AppAnnotation.ContainerAnnotation` and `ContainerModel.remove` so an object's node can list one of its ref arrays.
