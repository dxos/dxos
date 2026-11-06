---
'@dxos/app-toolkit': patch
'@dxos/plugin-code': patch
'@dxos/plugin-deck': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-messenger': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-review': patch
'@dxos/react-ui-canvas': patch
---

Fixes found while recording a two-person spec demo:

- On a graph canvas, a card laid out into a cell that a placed card holds moves along its row to the next free cell, so the two cards no longer stack.
- The feature map lays a spec's cards out once and pins them, so drawing an arrow or adding a feature no longer moves other cards. A card added from the `+` stays in the cell it was added in, and an Arrange button lays the map out again on demand.
- `/feature` leaves a bullet's marker out of the feature's description.
- An arrow just drawn on the feature canvas no longer reaches the companion as a selected feature, which failed with "Invalid argument ids".
- A resolved comment thread leaves Active comments as soon as it is resolved, on every peer.
- Opening a comment notification opens the commented object with Comments beside it. `LayoutOperation.Open` takes a linked companion (`~comments`) as its `variant` and opens it in the same navigation.
- The toolbar's Add comment comments on text selected in a feature field, also for a feature added after the project opened.
- The first feature `/feature` makes takes the cursor in its name, as later ones do.
- Renaming a feature in its form relabels its embeds in the spec's text.
- The feature-map skill writes out a whole spec with one import and gives each requirement line its own id.
