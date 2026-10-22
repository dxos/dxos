---
'@dxos/plugin-presenter': minor
'@dxos/app-framework': minor
---

Add the `Presentation` type, an ordered deck of owned markdown slides and linked objects that the navtree shows as a reorderable folder; collection decks and the `./Settings` and `./PresenterCapabilities` exports of `@dxos/plugin-presenter` are removed. `@dxos/app-framework` exports `Surface.matchCandidates`, and `@dxos/app-toolkit` adds `AppAnnotation.ContainerAnnotation` (an object's node lists one of its ref arrays) and `ContainerModel.isRemovable`: members a container marked `deleteOwned` owns get no remove action and are deleted only with it.
